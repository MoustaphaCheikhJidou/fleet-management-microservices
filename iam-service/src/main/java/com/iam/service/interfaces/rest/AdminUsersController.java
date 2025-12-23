package com.iam.service.interfaces.rest;

import com.iam.service.domain.model.queries.GetAllUsersQuery;
import com.iam.service.domain.model.valueobjects.Roles;
import com.iam.service.domain.services.UserCommandService;
import com.iam.service.domain.services.UserQueryService;
import com.iam.service.domain.model.commands.ResendInviteCommand;
import com.iam.service.interfaces.rest.resources.AdminUserResource;
import com.iam.service.interfaces.rest.resources.CreateAdminUserResource;
import com.iam.service.interfaces.rest.resources.InviteUserResource;
import com.iam.service.interfaces.rest.resources.UpdateUserStatusResource;
import com.iam.service.interfaces.rest.transform.AdminUserResourceFromEntityAssembler;
import com.iam.service.interfaces.rest.transform.CreateAdminUserCommandFromResourceAssembler;
import com.iam.service.interfaces.rest.transform.InviteUserCommandFromResourceAssembler;
import com.iam.service.interfaces.rest.transform.UpdateUserStatusCommandFromResourceAssembler;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping(value = "/api/v1/admin/users", produces = MediaType.APPLICATION_JSON_VALUE)
@Tag(name = "Administration", description = "Endpoints réservés aux administrateurs")
@Validated
@PreAuthorize("hasRole('ADMIN')")
public class AdminUsersController {

    private static final Logger LOGGER = LoggerFactory.getLogger(AdminUsersController.class);

    private final UserCommandService userCommandService;
    private final UserQueryService userQueryService;

    public AdminUsersController(UserCommandService userCommandService, UserQueryService userQueryService) {
        this.userCommandService = userCommandService;
        this.userQueryService = userQueryService;
    }

    @GetMapping
    @Operation(summary = "Lister les utilisateurs", description = "Retourne l'ensemble des comptes connus")
    public ResponseEntity<List<AdminUserResource>> listUsers() {
        var users = userQueryService.handle(new GetAllUsersQuery());
        var resources = users.stream()
                .map(AdminUserResourceFromEntityAssembler::toResourceFromEntity)
                .toList();
        return ResponseEntity.ok(resources);
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "Inviter un utilisateur", description = "Crée un compte Exploitant/Conducteur en attente d'activation")
    public ResponseEntity<?> inviteUser(@Valid @RequestBody InviteUserResource resource) {
        var command = InviteUserCommandFromResourceAssembler.toCommandFromResource(resource, null);
        try {
            var result = userCommandService.handle(command);
            if (result.isPresent()) {
                var userResource = AdminUserResourceFromEntityAssembler.toResourceFromEntity(result.get());
                LOGGER.info("Invitation générée via AdminPortal: {}", userResource.email());
            }
        } catch (Exception ex) {
            LOGGER.warn("Invitation retournée en réponse générique: {}", ex.getMessage());
        }
        return ResponseEntity.ok(Map.of("message", "Si l'email est valide, une invitation a été envoyée."));
    }

    @PostMapping(path = "/admins", consumes = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "Créer un administrateur", description = "Crée un nouveau compte ROLE_ADMIN")
    public ResponseEntity<AdminUserResource> createAdmin(@Valid @RequestBody CreateAdminUserResource resource) {
        var command = CreateAdminUserCommandFromResourceAssembler.toCommandFromResource(resource);
        var result = userCommandService.handle(command);
        if (result.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
        var adminResource = AdminUserResourceFromEntityAssembler.toResourceFromEntity(result.get());
        LOGGER.info("Administrator created via AdminPortal: {}", adminResource.email());
        return ResponseEntity.status(HttpStatus.CREATED).body(adminResource);
    }

    @GetMapping("/admins")
    @Operation(summary = "Lister les administrateurs", description = "Filtre les comptes portant ROLE_ADMIN")
    public ResponseEntity<List<AdminUserResource>> listAdminsOnly() {
        var users = userQueryService.handle(new GetAllUsersQuery());
        var adminResources = users.stream()
                .filter(user -> user.getRoles().stream().anyMatch(role -> role.getName() == Roles.ROLE_ADMIN))
                .map(AdminUserResourceFromEntityAssembler::toResourceFromEntity)
                .toList();
        return ResponseEntity.ok(adminResources);
    }

    @PatchMapping(value = "/{userId}/enabled", consumes = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "Activer/Désactiver un compte", description = "Permet de modifier le statut d'un utilisateur")
    public ResponseEntity<AdminUserResource> updateStatus(@PathVariable Long userId,
                                                          @Valid @RequestBody UpdateUserStatusResource resource) {
        var command = UpdateUserStatusCommandFromResourceAssembler.toCommandFromResource(userId, resource);
        var result = userCommandService.handle(command);
        if (result.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        var adminResource = AdminUserResourceFromEntityAssembler.toResourceFromEntity(result.get());
        LOGGER.info("Updated user status via AdminPortal: {} -> enabled={} ", adminResource.email(), adminResource.enabled());
        return ResponseEntity.ok(adminResource);
    }

    @PostMapping(value = "/{userId}/resend-invite")
    @Operation(summary = "Renvoyer l'invitation", description = "Renvoie un lien d'activation pour un compte en attente")
    public ResponseEntity<AdminUserResource> resendInvite(@PathVariable Long userId) {
        var result = userCommandService.handle(new ResendInviteCommand(userId));
        if (result.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
        var adminResource = AdminUserResourceFromEntityAssembler.toResourceFromEntity(result.get());
        LOGGER.info("Invitation renvoyée via AdminPortal: {}", adminResource.email());
        return ResponseEntity.ok(adminResource);
    }
}
