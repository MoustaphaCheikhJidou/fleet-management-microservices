package com.iam.service.interfaces.rest.resources;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Payload used for password reset / activation.
 */
public record ResetPasswordResource(
        @NotBlank String token,
        @NotBlank @Size(min = 8) String newPassword,
        @NotBlank String confirmPassword
) {
}
