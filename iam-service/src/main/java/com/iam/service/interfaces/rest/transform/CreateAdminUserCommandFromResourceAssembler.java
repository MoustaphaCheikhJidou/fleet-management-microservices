package com.iam.service.interfaces.rest.transform;

import com.iam.service.domain.model.commands.CreateAdminUserCommand;
import com.iam.service.interfaces.rest.resources.CreateAdminUserResource;

/**
 * Assembler converting {@link CreateAdminUserResource} to {@link CreateAdminUserCommand}.
 */
public class CreateAdminUserCommandFromResourceAssembler {

    private CreateAdminUserCommandFromResourceAssembler() {
        // utility
    }

    public static CreateAdminUserCommand toCommandFromResource(CreateAdminUserResource resource) {
        return new CreateAdminUserCommand(resource.username(), resource.email(), resource.password());
    }
}
