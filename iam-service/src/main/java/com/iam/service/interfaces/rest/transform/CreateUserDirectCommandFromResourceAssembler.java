package com.iam.service.interfaces.rest.transform;

import com.iam.service.domain.model.commands.CreateUserDirectCommand;
import com.iam.service.interfaces.rest.resources.CreateUserDirectResource;

/**
 * Assembler to convert CreateUserDirectResource to CreateUserDirectCommand.
 */
public class CreateUserDirectCommandFromResourceAssembler {
    
    public static CreateUserDirectCommand toCommandFromResource(CreateUserDirectResource resource) {
        return new CreateUserDirectCommand(
                resource.email(),
                resource.password(),
                resource.fullName(),
                resource.role(),
                resource.city(),
                resource.fleetSize(),
                resource.phone(),
                resource.carrierId()
        );
    }
}
