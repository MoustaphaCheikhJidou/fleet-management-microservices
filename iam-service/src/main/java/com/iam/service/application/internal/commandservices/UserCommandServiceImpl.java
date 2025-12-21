package com.iam.service.application.internal.commandservices;

import com.iam.service.application.internal.outboundservices.hashing.HashingService;
import com.iam.service.application.internal.outboundservices.tokens.TokenService;
import com.iam.service.domain.model.aggregates.User;
import com.iam.service.domain.model.commands.ChangeEmailCommand;
import com.iam.service.domain.model.commands.ChangePasswordCommand;
import com.iam.service.domain.model.commands.CreateAdminUserCommand;
import com.iam.service.domain.model.commands.SignInCommand;
import com.iam.service.domain.model.commands.SignUpCommand;
import com.iam.service.domain.model.commands.RegisterCarrierCommand;
import com.iam.service.domain.model.commands.UpdateUserStatusCommand;
import com.iam.service.domain.model.events.UserCreatedEvent;
import com.iam.service.domain.model.valueobjects.Roles;
import com.iam.service.domain.services.UserCommandService;
import com.iam.service.infrastructure.persistence.jpa.repositories.RoleRepository;
import com.iam.service.infrastructure.persistence.jpa.repositories.UserRepository;
import org.springframework.http.HttpStatus;
import org.apache.commons.lang3.tuple.ImmutablePair;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cloud.stream.function.StreamBridge;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.EnumSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * User command service implementation.
 * <p>
 *     This class implements the {@link UserCommandService} interface.
 *     It is used to handle the sign-up and sign in commands.
 * </p>
 *
 */
@Service
public class UserCommandServiceImpl implements UserCommandService {
    private static final Logger log = LoggerFactory.getLogger(UserCommandServiceImpl.class);
    private static final Set<Roles> SELF_REGISTRATION_ROLES = EnumSet.of(Roles.ROLE_CARRIER, Roles.ROLE_DRIVER);

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final HashingService hashingService;
    private final TokenService tokenService;
    private final StreamBridge streamBridge;

    /**
     * Constructor.
     *
     * @param userRepository the {@link UserRepository} user repository.
     * @param roleRepository the {@link RoleRepository} role repository.
     * @param hashingService the {@link HashingService} hashing service.
     * @param tokenService the {@link TokenService} token service.
     */
    public UserCommandServiceImpl(UserRepository userRepository, RoleRepository roleRepository, HashingService hashingService, TokenService tokenService, StreamBridge streamBridge) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.hashingService = hashingService;
        this.tokenService = tokenService;
        this.streamBridge = streamBridge;
    }

    // inherited javadoc
    @Override
    public Optional<User> handle(SignUpCommand command) {
        if (userRepository.existsByEmail(command.username())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email déjà utilisé");
        }
        var roles = command.roles().stream()
            .map(role -> roleRepository.findByName(role.getName())
                .orElseThrow(() -> new RuntimeException("Role name not found")))
            .peek(role -> {
                if (role.getName() == Roles.ROLE_ADMIN) {
                    throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Inscription administrateur interdite");
                }
            })
            .filter(role -> SELF_REGISTRATION_ROLES.contains(role.getName()))
            .collect(Collectors.toList());

        if (roles.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Inscription limitée aux profils Exploitant ou Conducteur");
        }
        var user = new User(command.username(), hashingService.encode(command.password()), roles);
        var savedUser = userRepository.save(user);

        publishUserCreatedEvent(savedUser, "self-signup");
        return Optional.of(savedUser);
    }


    @Override
    public Optional<ImmutablePair<User, String>> handle(SignInCommand command) {
        var user = userRepository.findByEmail(command.username())
                .orElseThrow(() -> new RuntimeException("Email not found"));
        if (!user.isEnabled()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Compte désactivé");
        }
        if (!hashingService.matches(command.password(), user.getPassword()))
            throw new RuntimeException("Invalid password");
        var token = tokenService.generateToken(user.getEmail());
        return Optional.of(new ImmutablePair<>(user, token));
    }

    @Override
    public Optional<User> handle(ChangePasswordCommand command) {
        var userOptional = userRepository.findById(java.util.Objects.requireNonNull(command.userId(), "userId must not be null"));
        if (userOptional.isEmpty()) { throw new RuntimeException("User not found with ID: " + command.userId());}
        var user = userOptional.get();
        if (!hashingService.matches(command.currentPassword(), user.getPassword())) { throw new RuntimeException("Current password is incorrect"); }
        user.setPassword(hashingService.encode(command.newPassword()));
        var savedUser = userRepository.save(user);
        return Optional.of(savedUser);
    }

    @Override
    public Optional<User> handle(ChangeEmailCommand command) {
        var userOptional = userRepository.findById(java.util.Objects.requireNonNull(command.userId(), "userId must not be null"));
        if (userOptional.isEmpty()) { throw new RuntimeException("User not found with ID: " + command.userId()); }
        var user = userOptional.get();
        if (!hashingService.matches(command.password(), user.getPassword())) { throw new RuntimeException("Password is incorrect"); }
        if (userRepository.existsByEmail(command.newEmail())) { throw new RuntimeException("Email already exists: " + command.newEmail()); }
        user.setEmail(command.newEmail());
        var savedUser = userRepository.save(user);
        return Optional.of(savedUser);
    }

    @Override
    public boolean deleteUser(Long userId) {
        log.info("Attempting to delete user with ID: {}", userId);
        if (userId == null) {
            log.warn("Failed to delete user: User ID is null");
            return false;
        }
        var userOptional = userRepository.findById(java.util.Objects.requireNonNull(userId, "userId must not be null"));
        if (userOptional.isEmpty()) {
            log.warn("Failed to delete user: User with ID {} not found", userId);
            return false;
        }

        try {
            userRepository.deleteById(java.util.Objects.requireNonNull(userId, "userId must not be null"));
            log.info("User with ID: {} deleted successfully", userId);
            return true;
        } catch (Exception e) {
            log.error("Error deleting user with ID: {}", userId, e);
            throw new RuntimeException("Failed to delete user: " + e.getMessage());
        }
    }

    @Override
    public Optional<User> handle(RegisterCarrierCommand command) {
        if (userRepository.existsByEmail(command.username())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email déjà utilisé");
        }

        // Obtener los roles (asegurándonos que incluya ROLE_CARRIER)
        var roles = command.roles().stream()
                .map(role -> roleRepository.findByName(role.getName())
                    .orElseThrow(() -> new RuntimeException("Role name not found")))
                .collect(Collectors.toList());

        // Verificar que al menos tenga el rol CARRIER
        boolean hasCarrierRole = roles.stream()
                .anyMatch(role -> role.getName() == Roles.ROLE_CARRIER);

        if (!hasCarrierRole) {
            roles.add(roleRepository.findByName(Roles.ROLE_CARRIER)
                    .orElseThrow(() -> new RuntimeException("Carrier role not found")));
        }

        // Crear el usuario carrier con referencia al manager que lo creó
        var user = new User(command.username(), hashingService.encode(command.password()), roles, command.managerId());
        var savedUser = userRepository.save(user);

        publishUserCreatedEvent(savedUser, "carrier-registration");
        return Optional.of(savedUser);
    }

    @Override
    public Optional<User> handle(CreateAdminUserCommand command) {
        if (command.email() == null || command.email().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email requis");
        }
        if (command.password() == null || command.password().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mot de passe requis");
        }

        var sanitizedUsername = (command.username() == null || command.username().isBlank())
                ? command.email()
                : command.username().trim();

        if (userRepository.existsByEmail(command.email())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email déjà utilisé");
        }

        if (userRepository.existsByUsername(sanitizedUsername)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Nom d'utilisateur déjà utilisé");
        }

        var adminRole = roleRepository.findByName(Roles.ROLE_ADMIN)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "ROLE_ADMIN introuvable"));

        var newAdmin = new User(command.email(), sanitizedUsername, hashingService.encode(command.password()), List.of(adminRole));
        var savedUser = userRepository.save(newAdmin);
        publishUserCreatedEvent(savedUser, "admin-portal");
        return Optional.of(savedUser);
    }

    @Override
    public Optional<User> handle(UpdateUserStatusCommand command) {
        if (command.userId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Identifiant utilisateur requis");
        }

        var user = userRepository.findById(command.userId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));
        user.setEnabled(command.enabled());
        var savedUser = userRepository.save(user);
        return Optional.of(savedUser);
    }

    private void publishUserCreatedEvent(User savedUser, String context) {
        try {
            UserCreatedEvent event = new UserCreatedEvent(savedUser.getId(), savedUser.getEmail());
            streamBridge.send("user-events", event);
            log.info("User created event published for userId: {} ({})", savedUser.getId(), context);
        } catch (Exception e) {
            log.error("Failed to publish UserCreatedEvent for userId: {}", savedUser.getId(), e);
        }
    }
}
