package com.iam.service.interfaces.rest;

import com.iam.service.domain.services.UserCommandService;
import com.iam.service.interfaces.rest.resources.AuthenticatedUserResource;
import com.iam.service.interfaces.rest.resources.SignInResource;
import com.iam.service.interfaces.rest.resources.SignUpResource;
import com.iam.service.interfaces.rest.resources.UserResource;
import com.iam.service.interfaces.rest.transform.AuthenticatedUserResourceFromEntityAssembler;
import com.iam.service.interfaces.rest.transform.SignInCommandFromResourceAssembler;
import com.iam.service.interfaces.rest.transform.SignUpCommandFromResourceAssembler;
import com.iam.service.interfaces.rest.transform.UserResourceFromEntityAssembler;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@RestController
@RequestMapping(value = {"/api/v1/authentication", "/api/v1/auth"}, produces = MediaType.APPLICATION_JSON_VALUE)
@Tag(name = "Authentication", description = "Available Authentication Endpoints")
public class AuthenticationController {
    private final UserCommandService userCommandService;
    private static final Logger log = LoggerFactory.getLogger(AuthenticationController.class);

    public AuthenticationController(UserCommandService userCommandService) {
        this.userCommandService = userCommandService;
    }

    @PostMapping({"/sign-up", "/signup"})
    @Operation(summary = "Sign up a new user", description = "Sign up a new user with the provided username, password, and roles.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "User created successfully."),
            @ApiResponse(responseCode = "400", description = "Bad request.")
    })
    public ResponseEntity<?> signUp(@RequestBody SignUpResource resource) {
        log.info("Sign-up request for email={}", resource.email());
        try {
            var signUpCommand = SignUpCommandFromResourceAssembler.toCommandFromResource(resource);
            var user = userCommandService.handle(signUpCommand);
            if (user.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Création du compte impossible."));
            }
            var userEntity = user.get();
            var userResource = UserResourceFromEntityAssembler.toResourceFromEntity(userEntity);
            log.info("Sign-up successful for email={}", resource.email());
            return new ResponseEntity<>(userResource, HttpStatus.CREATED);
        } catch (ResponseStatusException ex) {
            log.warn("Sign-up rejected for email={} due to {}", resource.email(), ex.getReason());
            return ResponseEntity.status(ex.getStatusCode())
                    .body(Map.of("message", ex.getReason()));
        } catch (RuntimeException ex) {
            log.error("Unexpected error during sign-up for email={}", resource.email(), ex);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping({"/sign-in", "/signin"})
    @Operation(summary = "Sign in a user", description = "Sign in a user with the provided username and password.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "User signed in successfully."),
            @ApiResponse(responseCode = "404", description = "User not found.")
    })
    public ResponseEntity<AuthenticatedUserResource> signIn(@RequestBody SignInResource resource) {
        log.info("Sign-in request for email={}", resource.email());
        var signInCommand = SignInCommandFromResourceAssembler.toCommandFromResource(resource);
        var authenticatedUserResult = userCommandService.handle(signInCommand);
        if (authenticatedUserResult.isEmpty()) return ResponseEntity.notFound().build();
        var authenticatedUser = authenticatedUserResult.get();
        var authenticatedUserResource = AuthenticatedUserResourceFromEntityAssembler.toResourceFromEntity(authenticatedUser.left, authenticatedUser.right);
        log.info("Sign-in successful for email={}", resource.email());
        return ResponseEntity.ok(authenticatedUserResource);
    }
}
