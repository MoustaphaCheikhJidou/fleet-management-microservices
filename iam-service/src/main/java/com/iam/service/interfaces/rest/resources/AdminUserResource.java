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
 * @param createdAt ISO-8601 formatted creation date
 */
public record AdminUserResource(
        Long id,
        String username,
        String email,
        List<String> roles,
        boolean enabled,
        String createdAt
) {
}
