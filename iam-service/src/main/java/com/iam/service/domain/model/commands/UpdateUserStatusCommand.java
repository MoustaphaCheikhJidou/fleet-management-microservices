package com.iam.service.domain.model.commands;

/**
 * Command used to toggle the enabled flag of a user account.
 *
 * @param userId the user identifier
 * @param enabled whether the account should be enabled
 */
public record UpdateUserStatusCommand(Long userId, boolean enabled) {
}
