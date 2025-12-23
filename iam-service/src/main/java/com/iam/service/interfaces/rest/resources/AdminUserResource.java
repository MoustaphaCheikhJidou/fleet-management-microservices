package com.iam.service.interfaces.rest.resources;

import java.util.List;

/**
 * Resource exposing administrator-managed accounts.
 *
 * @param id identifier of the user
 * @param username display or login name
 * @param email login email
 * @param roles attached roles
 * @param enabled whether the account is enabled
 * @param status account status (pending/active/disabled)
 * @param fullName optional display name
 * @param city optional city/business info
 * @param company optional company label
 * @param fleetSize optional fleet size
 * @param phone optional phone
 * @param vehicle optional vehicle/identifier
 * @param resetTokenExpiry optional ISO-8601 expiry for activation/reset token
 * @param createdAt ISO-8601 formatted creation date
 */
public record AdminUserResource(
        Long id,
        String username,
        String email,
        List<String> roles,
        boolean enabled,
        String status,
        String fullName,
        String city,
        String company,
        Integer fleetSize,
        String phone,
        String vehicle,
        String resetTokenExpiry,
        String createdAt
) {
}
