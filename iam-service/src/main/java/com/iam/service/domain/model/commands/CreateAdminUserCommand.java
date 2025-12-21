package com.iam.service.domain.model.commands;

/**
 * Command used to create a new administrator account.
 *
 * @param username the desired username (display/login name)
 * @param email the unique email used for authentication
 * @param password the raw password that will be hashed before persistence
 */
public record CreateAdminUserCommand(String username, String email, String password) {
}
