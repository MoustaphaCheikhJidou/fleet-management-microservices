package com.iam.service.interfaces.rest.transform;

import com.iam.service.domain.model.commands.SignUpCommand;
import com.iam.service.domain.model.entities.Role;
import com.iam.service.domain.model.valueobjects.Roles;
import com.iam.service.interfaces.rest.resources.SignUpResource;
import org.springframework.http.HttpStatus;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import java.util.EnumSet;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Assembler to convert a SignUpResource to a SignUpCommand.
 * <p>
 *     This class is used to convert a SignUpResource to a SignUpCommand.
 * </p>
 */
public class SignUpCommandFromResourceAssembler {
    private static final Set<Roles> SELF_REGISTRATION_ROLES = EnumSet.of(Roles.ROLE_CARRIER, Roles.ROLE_DRIVER);

    /**
     * Converts a SignUpResource to a SignUpCommand.
     *
     * @param resource The SignUpResource to convert.
     * @return The SignUpCommand.
     */
    public static SignUpCommand toCommandFromResource(SignUpResource resource) {
        var requestedRoles = Optional.ofNullable(resource.roles()).orElse(List.of());
        List<Role> sanitizedRoles = requestedRoles.stream()
                .filter(StringUtils::hasText)
                .map(role -> role.trim().toUpperCase())
                .map(SignUpCommandFromResourceAssembler::mapToAllowedRole)
                .filter(Objects::nonNull)
                .map(roleEnum -> Role.toRoleFromName(roleEnum.name()))
                .collect(Collectors.toList());

        if (sanitizedRoles.isEmpty()) {
            sanitizedRoles = List.of(Role.getDefaultRole());
        }

        return new SignUpCommand(resource.email(), resource.password(), sanitizedRoles);
    }

    private static Roles mapToAllowedRole(String candidate) {
        final Roles parsedRole;
        try {
            parsedRole = Roles.valueOf(candidate);
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Rôle inconnu : " + candidate);
        }

        if (parsedRole == Roles.ROLE_ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Inscription administrateur interdite");
        }

        return SELF_REGISTRATION_ROLES.contains(parsedRole) ? parsedRole : null;
    }
}
