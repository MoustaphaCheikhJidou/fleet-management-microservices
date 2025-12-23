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
        var resetExpiry = entity.getResetTokenExpiry() != null ? entity.getResetTokenExpiry().toString() : null;
        return new AdminUserResource(
                entity.getId(),
                entity.getUsername(),
                entity.getEmail(),
                RoleStringListFromEntityListAssembler.toResourceListFromEntitySet(entity.getRoles()),
                entity.isEnabled(),
            entity.getStatus().name(),
            entity.getFullName(),
            entity.getCity(),
            entity.getCompany(),
            entity.getFleetSize(),
            entity.getPhone(),
            entity.getVehicle(),
            resetExpiry,
                createdAt
        );
    }
}
