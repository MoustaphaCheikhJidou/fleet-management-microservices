package com.iam.service.interfaces.rest.resources;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Resource for direct user creation by admin (with password).
 * Creates CARRIER or DRIVER accounts that are immediately active.
 */
public record CreateUserDirectResource(
        @NotBlank(message = "L'email est requis")
        @Email(message = "Email invalide")
        String email,

        @NotBlank(message = "Le mot de passe est requis")
        @Size(min = 8, message = "Le mot de passe doit contenir au moins 8 caractères")
        String password,

        @NotBlank(message = "Le nom complet est requis")
        String fullName,

        @NotBlank(message = "Le rôle est requis (CARRIER ou DRIVER)")
        String role,

        // Optional fields for CARRIER
        String city,
        Integer fleetSize,

        // Optional fields for DRIVER
        String phone,
        Long carrierId
) {}
