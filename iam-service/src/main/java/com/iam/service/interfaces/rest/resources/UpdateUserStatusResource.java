package com.iam.service.interfaces.rest.resources;

import jakarta.validation.constraints.NotNull;

/**
 * Resource used to toggle the enabled flag of a user account.
 */
public record UpdateUserStatusResource(@NotNull(message = "Le statut est requis") Boolean enabled) {
}
