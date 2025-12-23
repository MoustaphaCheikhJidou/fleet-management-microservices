package com.iam.service.domain.model.commands;

/**
 * Command to resend an activation invite to a pending user.
 */
public record ResendInviteCommand(Long userId) {
}
