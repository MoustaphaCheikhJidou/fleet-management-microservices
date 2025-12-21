package com.iam.service.interfaces.rest.transform;

import com.iam.service.domain.model.commands.UpdateUserStatusCommand;
import com.iam.service.interfaces.rest.resources.UpdateUserStatusResource;

/**
 * Assembler converting {@link UpdateUserStatusResource} to {@link UpdateUserStatusCommand}.
 */
public class UpdateUserStatusCommandFromResourceAssembler {

    private UpdateUserStatusCommandFromResourceAssembler() {
        // utility
    }

    public static UpdateUserStatusCommand toCommandFromResource(Long userId, UpdateUserStatusResource resource) {
        return new UpdateUserStatusCommand(userId, resource.enabled());
    }
}
