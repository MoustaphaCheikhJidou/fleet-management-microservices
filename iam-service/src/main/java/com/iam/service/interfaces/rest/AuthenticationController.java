package com.iam.service.interfaces.rest;

import com.iam.service.domain.services.UserCommandService;
import com.iam.service.interfaces.rest.resources.AuthenticatedUserResource;
import com.iam.service.interfaces.rest.resources.ResetPasswordResource;
import com.iam.service.interfaces.rest.resources.SignInResource;
import com.iam.service.interfaces.rest.resources.SignUpResource;
import com.iam.service.interfaces.rest.resources.UserResource;
import com.iam.service.interfaces.rest.transform.AuthenticatedUserResourceFromEntityAssembler;
import com.iam.service.interfaces.rest.transform.ResetPasswordCommandFromResourceAssembler;
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
        log.info("Sign-up disabled request for email={}", resource.email());
        return ResponseEntity.status(HttpStatus.GONE)
                .body(Map.of("message", "Création de compte désactivée : contactez un administrateur."));
    }

    @PostMapping({"/sign-in", "/signin"})
    @Operation(summary = "Sign in a user", description = "Sign in a user with the provided username and password.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "User signed in successfully."),
            @ApiResponse(responseCode = "404", description = "User not found.")
    })
    public ResponseEntity<AuthenticatedUserResource> signIn(@RequestBody SignInResource resource) {
        log.info("Sign-in request for email={}", resource.email());
        try {
            var signInCommand = SignInCommandFromResourceAssembler.toCommandFromResource(resource);
            var authenticatedUserResult = userCommandService.handle(signInCommand);
            if (authenticatedUserResult.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            var authenticatedUser = authenticatedUserResult.get();
            var authenticatedUserResource = AuthenticatedUserResourceFromEntityAssembler.toResourceFromEntity(authenticatedUser.left, authenticatedUser.right);
            log.info("Sign-in successful for email={}", resource.email());
            return ResponseEntity.ok(authenticatedUserResource);
        } catch (ResponseStatusException ex) {
            log.warn("Sign-in refused for email={} cause={}", resource.email(), ex.getReason());
            return ResponseEntity.status(ex.getStatusCode()).body(new AuthenticatedUserResource(null, null, null, null));
        }
    }

    @PostMapping({"/reset-password"})
    @Operation(summary = "Reset/activate password", description = "Complete password reset from a one-time token")
    public ResponseEntity<?> resetPassword(@RequestBody ResetPasswordResource resource) {
        if (!resource.newPassword().equals(resource.confirmPassword())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", "Les mots de passe ne correspondent pas."));
        }

        try {
            var command = ResetPasswordCommandFromResourceAssembler.toCommandFromResource(resource);
            var user = userCommandService.handle(command);
            if (user.isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("message", "Lien expiré ou invalide"));
            }
            var userResource = UserResourceFromEntityAssembler.toResourceFromEntity(user.get());
            return ResponseEntity.ok(userResource);
        } catch (ResponseStatusException ex) {
            return ResponseEntity.status(ex.getStatusCode())
                    .body(Map.of("message", ex.getReason()));
        }
    }
}
