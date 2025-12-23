package com.iam.service.domain.model.commands;

/**
 * Command representing a password reset using a one-time token.
 */
public record ResetPasswordWithTokenCommand(String token, String newPassword) {
}
