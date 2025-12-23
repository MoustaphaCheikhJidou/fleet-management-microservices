package com.iam.service.interfaces.rest.resources;

import java.util.List;

/**
 * Authenticated user resource.
 */
public record AuthenticatedUserResource(Long id, String email, List<String> roles, String token) {
}
