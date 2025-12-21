package com.iam.service.interfaces.rest.transform;

import com.iam.service.domain.model.aggregates.User;
import com.iam.service.interfaces.rest.resources.AdminUserResource;

/**
 * Assembler converting User aggregates to admin-facing resources.
 */
public class AdminUserResourceFromEntityAssembler {

    private AdminUserResourceFromEntityAssembler() {
        // utility
    }

    public static AdminUserResource toResourceFromEntity(User entity) {
        var createdAt = entity.getCreatedAt() != null ? entity.getCreatedAt().toInstant().toString() : null;
        return new AdminUserResource(
                entity.getId(),
                entity.getUsername(),
                entity.getEmail(),
                RoleStringListFromEntityListAssembler.toResourceListFromEntitySet(entity.getRoles()),
                entity.isEnabled(),
                createdAt
        );
    }
}
