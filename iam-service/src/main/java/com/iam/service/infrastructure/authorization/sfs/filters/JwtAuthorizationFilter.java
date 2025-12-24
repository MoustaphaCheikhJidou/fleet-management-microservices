package com.iam.service.infrastructure.authorization.sfs.filters;

import com.iam.service.application.internal.outboundservices.tokens.TokenService;
import com.iam.service.infrastructure.authorization.sfs.services.UserDetailsServiceImpl;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Filter that authenticates incoming requests carrying a Bearer token.
 */
@Component
public class JwtAuthorizationFilter extends OncePerRequestFilter {

    private static final Logger LOGGER = LoggerFactory.getLogger(JwtAuthorizationFilter.class);

    private final TokenService tokenService;
    private final UserDetailsServiceImpl userDetailsService;

    public JwtAuthorizationFilter(TokenService tokenService, UserDetailsServiceImpl userDetailsService) {
        this.tokenService = tokenService;
        this.userDetailsService = userDetailsService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        
        // First check if gateway has already authenticated (via X-User-* headers)
        String gatewayUserEmail = request.getHeader("X-User-Email");
        String gatewayUserRoles = request.getHeader("X-User-Roles");
        
        if (StringUtils.hasText(gatewayUserEmail) && StringUtils.hasText(gatewayUserRoles) 
                && SecurityContextHolder.getContext().getAuthentication() == null) {
            // Gateway has pre-authenticated this request
            try {
                UserDetails userDetails = userDetailsService.loadUserByUsername(gatewayUserEmail);
                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(
                                userDetails,
                                null,
                                userDetails.getAuthorities());
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authentication);
                LOGGER.debug("Authenticated user {} via Gateway headers", gatewayUserEmail);
                filterChain.doFilter(request, response);
                return;
            } catch (Exception exception) {
                LOGGER.warn("Failed to authenticate user {} via Gateway headers: {}", gatewayUserEmail, exception.getMessage());
            }
        }
        
        // Fallback to JWT token authentication
        String authHeader = request.getHeader(HttpHeaders.AUTHORIZATION);

        if (StringUtils.hasText(authHeader) && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            if (tokenService.validateToken(token)) {
                String username = tokenService.getUsernameFromToken(token);
                if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                    try {
                        UserDetails userDetails = userDetailsService.loadUserByUsername(username);
                        UsernamePasswordAuthenticationToken authentication =
                                new UsernamePasswordAuthenticationToken(
                                        userDetails,
                                        null,
                                        userDetails.getAuthorities());
                        authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                        SecurityContextHolder.getContext().setAuthentication(authentication);
                        LOGGER.debug("Authenticated user {} via JWT token", username);
                    } catch (Exception exception) {
                        LOGGER.warn("Failed to authenticate user {} via JWT: {}", username, exception.getMessage());
                    }
                }
            }
        }

        filterChain.doFilter(request, response);
    }
}
