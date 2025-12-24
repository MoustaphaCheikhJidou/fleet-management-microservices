package com.iam.service.domain.services;

import com.iam.service.domain.model.aggregates.User;
import com.iam.service.domain.model.commands.ChangeEmailCommand;
import com.iam.service.domain.model.commands.ChangePasswordCommand;
import com.iam.service.domain.model.commands.CreateAdminUserCommand;
import com.iam.service.domain.model.commands.CreateUserDirectCommand;
import com.iam.service.domain.model.commands.InviteUserCommand;
import com.iam.service.domain.model.commands.RegisterCarrierCommand;
import com.iam.service.domain.model.commands.ResendInviteCommand;
import com.iam.service.domain.model.commands.SignInCommand;
import com.iam.service.domain.model.commands.SignUpCommand;
import com.iam.service.domain.model.commands.ResetPasswordWithTokenCommand;
import com.iam.service.domain.model.commands.UpdateUserStatusCommand;
import org.apache.commons.lang3.tuple.ImmutablePair;

import java.util.Optional;

/**
 * User command service.
 * <p>
 *     This service is responsible for handling user commands.
 *     It provides methods to handle sign-up and sign-in commands.
 * </p>
 */
public interface UserCommandService {
    /**
     * Handle sign-up command.
     *
     * @param command the command
     * @return an optional of user if the sign-up was successful
     */
    Optional<User> handle(SignUpCommand command);

    /**
     * Handle sign in command.
     *
     * @param command the command
     * @return an optional of user and token if the sign-in was successful
     */
    Optional<ImmutablePair<User, String>> handle(SignInCommand command);

    /**
     * Handle change password command.
     *
     * @param command the command
     * @return an optional of user if the password change was successful
     * @throws RuntimeException if the current password is incorrect or user not found
     */
    Optional<User> handle(ChangePasswordCommand command);

    /**
     * Handle change email command.
     *
     * @param command the command
     * @return an optional of user if the email change was successful
     * @throws RuntimeException if the password is incorrect, user not found, or new email already exists
     */
    Optional<User> handle(ChangeEmailCommand command);

    /**
     * Handle register carrier command.
     *
     * @param command the command containing carrier details and manager ID
     * @return an optional of user if the carrier registration was successful
     */
    Optional<User> handle(RegisterCarrierCommand command);

    /**
     * Handle create admin user command.
     *
     * @param command the command with new admin data
     * @return the created admin user
     */
    Optional<User> handle(CreateAdminUserCommand command);

    /**
     * Handle update user status command.
     *
     * @param command toggle command
     * @return the updated user if present
     */
    Optional<User> handle(UpdateUserStatusCommand command);

    /**
     * Handle direct user creation by admin (with password).
     * Creates CARRIER or DRIVER accounts that are immediately active.
     *
     * @param command the command with user data including password
     * @return the created user
     */
    Optional<User> handle(CreateUserDirectCommand command);

    /**
     * Handle admin-driven user invitation.
     */
    Optional<User> handle(InviteUserCommand command);

    /**
     * Handle re-sending an invite token.
     */
    Optional<User> handle(ResendInviteCommand command);

    /**
     * Handle password reset / activation via token.
     */
    Optional<User> handle(ResetPasswordWithTokenCommand command);

    /**
     * Delete a user by ID.
     *
     * @param userId the ID of the user to delete
     * @return true if the user was deleted successfully, false otherwise
     * @throws RuntimeException if the user could not be deleted
     */
    boolean deleteUser(Long userId);
}
