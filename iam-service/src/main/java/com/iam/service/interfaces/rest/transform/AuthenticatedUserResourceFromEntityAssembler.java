package com.iam.service.interfaces.rest.transform;

import com.iam.service.domain.model.aggregates.User;
import com.iam.service.domain.model.entities.Role;
import com.iam.service.interfaces.rest.resources.AuthenticatedUserResource;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Assembler to convert a User entity to an AuthenticatedUserResource.
 * <p>
 *     This class is used to convert a User entity to an AuthenticatedUserResource.
 * </p>
 */
public class AuthenticatedUserResourceFromEntityAssembler {
    /**
     * Converts a User entity to an AuthenticatedUserResource.
     *
     * @param entity The User entity to convert.
     * @param token The token to include in the AuthenticatedUserResource.
     * @return The AuthenticatedUserResource.
     */
    public static AuthenticatedUserResource toResourceFromEntity(User entity, String token) {
        List<String> roles = entity.getRoles() == null
                ? List.of()
                : entity.getRoles().stream()
                    .map(Role::getStringName)
                    .collect(Collectors.toList());
        return new AuthenticatedUserResource(
                entity.getId(),
                entity.getEmail(),
                roles,
                token);
    }
}
