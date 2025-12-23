package com.iam.service.infrastructure.authorization.sfs.model;

import com.iam.service.domain.model.aggregates.User;
import com.iam.service.domain.model.valueobjects.AccountStatus;
import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;

/**
 * Simplified User details implementation for IAM microservice
 * <p>
 *     This class is used to provide user details for authentication purposes.
 *     Token validation is handled by the API Gateway.
 * </p>
 */
@Getter
@EqualsAndHashCode
public class UserDetailsImpl implements UserDetails {

    private final String email;

    @JsonIgnore
    private final String password;

    private final Collection<? extends GrantedAuthority> authorities;

    private final boolean enabled;

    /**
     * Constructor
     * @param email Email
     * @param password Password
     * @param authorities Authorities
     */
    public UserDetailsImpl(String email, String password, Collection<? extends GrantedAuthority> authorities, boolean enabled) {
        this.email = email;
        this.password = password;
        this.authorities = authorities;
        this.enabled = enabled;
    }

    /**
     * Build user details
     * @param user User
     * @return User details
     */
    public static UserDetailsImpl build(User user) {
        var authorities = user.getRoles().stream()
                .map(role -> role.getName().name())
                .map(SimpleGrantedAuthority::new)
                .toList();

        boolean activeStatus = user.getStatus() == null || user.getStatus() == AccountStatus.ACTIVE;
        return new UserDetailsImpl(
            user.getEmail(),
            user.getPassword(),
            authorities,
            user.isEnabled() && activeStatus
        );
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return enabled;
    }
}
