package com.iam.service.interfaces.rest.transform;

import com.iam.service.domain.model.commands.ResetPasswordWithTokenCommand;
import com.iam.service.interfaces.rest.resources.ResetPasswordResource;

public class ResetPasswordCommandFromResourceAssembler {
    private ResetPasswordCommandFromResourceAssembler() {}

    public static ResetPasswordWithTokenCommand toCommandFromResource(ResetPasswordResource resource) {
        return new ResetPasswordWithTokenCommand(resource.token(), resource.newPassword());
    }
}
