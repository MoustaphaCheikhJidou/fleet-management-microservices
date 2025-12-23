package com.iam.service.domain.model.commands;

import com.iam.service.domain.model.valueobjects.Roles;

/**
 * Command to invite a new user (operator or driver) via admin provisioning.
 */
public record InviteUserCommand(
        String email,
        String fullName,
        Roles role,
        String city,
        String company,
        Integer fleetSize,
        String phone,
        String vehicle,
        Long createdBy
) {
}
