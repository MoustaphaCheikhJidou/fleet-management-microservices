package com.iam.service.interfaces.rest.resources;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Resource used to create an administrator via the Admin Portal endpoints.
 */
public record CreateAdminUserResource(
        @NotBlank(message = "Le nom d'utilisateur est requis")
        @Size(max = 60)
        String username,

        @NotBlank(message = "L'email est requis")
        @Email(message = "Email invalide")
        String email,

        @NotBlank(message = "Le mot de passe est requis")
        @Size(min = 8, max = 120)
        String password
) {
}
