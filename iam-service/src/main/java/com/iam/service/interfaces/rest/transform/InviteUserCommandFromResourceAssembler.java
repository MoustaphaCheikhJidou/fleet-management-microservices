package com.iam.service.interfaces.rest.transform;

import com.iam.service.domain.model.commands.InviteUserCommand;
import com.iam.service.domain.model.valueobjects.Roles;
import com.iam.service.interfaces.rest.resources.InviteUserResource;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.Locale;
import java.util.Optional;

/**
 * Assembler to convert invite payload to command.
 */
public class InviteUserCommandFromResourceAssembler {
    private InviteUserCommandFromResourceAssembler() {
    }

    public static InviteUserCommand toCommandFromResource(InviteUserResource resource, Long createdBy) {
        var role = normalizeRole(resource.role());
        return new InviteUserCommand(
                resource.email(),
                resource.fullName(),
                role,
                resource.resolvedCity(),
                resource.resolvedCompany(),
                resource.resolvedFleetSize(),
                resource.resolvedPhone(),
                resource.resolvedVehicle(),
                createdBy
        );
    }

    private static Roles normalizeRole(String rawRole) {
        var candidate = Optional.ofNullable(rawRole)
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Rôle requis"));

        var upper = candidate.toUpperCase(Locale.ROOT);
        if (!upper.startsWith("ROLE_")) {
            upper = "ROLE_" + upper;
        }

        try {
            return Roles.valueOf(upper);
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Rôle invalide: " + candidate);
        }
    }
}
