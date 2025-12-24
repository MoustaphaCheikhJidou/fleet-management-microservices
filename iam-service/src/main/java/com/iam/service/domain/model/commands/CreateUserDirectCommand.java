package com.iam.service.domain.model.commands;

/**
 * Command for direct user creation by admin (with password).
 * Creates CARRIER or DRIVER accounts that are immediately active.
 *
 * @param email the unique email for the new user
 * @param password the raw password (will be hashed)
 * @param fullName the display name
 * @param role CARRIER or DRIVER
 * @param city optional city for CARRIER
 * @param fleetSize optional fleet size for CARRIER
 * @param phone optional phone for DRIVER
 * @param carrierId optional carrier ID for DRIVER
 */
public record CreateUserDirectCommand(
        String email,
        String password,
        String fullName,
        String role,
        String city,
        Integer fleetSize,
        String phone,
        Long carrierId
) {}
