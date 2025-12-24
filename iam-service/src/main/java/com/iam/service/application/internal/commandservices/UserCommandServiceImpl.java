package com.iam.service.application.internal.commandservices;

import com.iam.service.application.internal.outboundservices.hashing.HashingService;
import com.iam.service.application.internal.outboundservices.mail.MailNotificationService;
import com.iam.service.application.internal.outboundservices.tokens.TokenService;
import com.iam.service.domain.model.aggregates.User;
import com.iam.service.domain.model.commands.ChangeEmailCommand;
import com.iam.service.domain.model.commands.ChangePasswordCommand;
import com.iam.service.domain.model.commands.CreateAdminUserCommand;
import com.iam.service.domain.model.commands.CreateUserDirectCommand;
import com.iam.service.domain.model.commands.InviteUserCommand;
import com.iam.service.domain.model.commands.RegisterCarrierCommand;
import com.iam.service.domain.model.commands.ResendInviteCommand;
import com.iam.service.domain.model.commands.ResetPasswordWithTokenCommand;
import com.iam.service.domain.model.commands.SignInCommand;
import com.iam.service.domain.model.commands.SignUpCommand;
import com.iam.service.domain.model.commands.UpdateUserStatusCommand;
import com.iam.service.domain.model.events.UserCreatedEvent;
import com.iam.service.domain.model.valueobjects.AccountStatus;
import com.iam.service.domain.model.valueobjects.Roles;
import com.iam.service.domain.services.UserCommandService;
import com.iam.service.infrastructure.persistence.jpa.repositories.RoleRepository;
import com.iam.service.infrastructure.persistence.jpa.repositories.UserRepository;
import org.apache.commons.lang3.tuple.ImmutablePair;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.cloud.stream.function.StreamBridge;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.EnumSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
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
    private static final Duration INVITE_TOKEN_TTL = Duration.ofMinutes(90);

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final HashingService hashingService;
    private final TokenService tokenService;
    private final StreamBridge streamBridge;
    private final MailNotificationService mailNotificationService;
    private final SecureRandom secureRandom = new SecureRandom();

    /**
     * Constructor.
     *
     * @param userRepository the {@link UserRepository} user repository.
     * @param roleRepository the {@link RoleRepository} role repository.
     * @param hashingService the {@link HashingService} hashing service.
     * @param tokenService the {@link TokenService} token service.
     */
    public UserCommandServiceImpl(UserRepository userRepository, RoleRepository roleRepository, HashingService hashingService, TokenService tokenService, StreamBridge streamBridge, MailNotificationService mailNotificationService) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.hashingService = hashingService;
        this.tokenService = tokenService;
        this.streamBridge = streamBridge;
        this.mailNotificationService = mailNotificationService;
    }

    // inherited javadoc
    @Override
    public Optional<User> handle(SignUpCommand command) {
        throw new ResponseStatusException(HttpStatus.GONE, "Inscription désactivée : contactez un administrateur.");
    }


    @Override
    public Optional<ImmutablePair<User, String>> handle(SignInCommand command) {
        var user = userRepository.findByEmail(command.username())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Email ou mot de passe incorrect."));

        if (user.getStatus() == AccountStatus.PENDING_ACTIVATION || user.getStatus() == AccountStatus.INVITED) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Compte non activé — consultez votre email pour définir votre mot de passe.");
        }

        if (user.getStatus() == AccountStatus.DISABLED || !user.isEnabled()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Compte désactivé.");
        }

        if (user.getPassword() == null || !hashingService.matches(command.password(), user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Email ou mot de passe incorrect.");
        }
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
        
        // When activating a user, also set their account status to ACTIVE
        if (command.enabled()) {
            user.setStatus(AccountStatus.ACTIVE);
        } else {
            user.setStatus(AccountStatus.DISABLED);
        }
        
        var savedUser = userRepository.save(user);
        return Optional.of(savedUser);
    }

    @Override
    public Optional<User> handle(CreateUserDirectCommand command) {
        if (command.email() == null || command.email().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email requis");
        }
        if (command.password() == null || command.password().length() < 8) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mot de passe requis (min 8 caractères)");
        }
        if (command.role() == null || command.role().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Rôle requis (CARRIER ou DRIVER)");
        }

        String roleUpperCase = command.role().toUpperCase();
        Roles targetRole;
        if ("CARRIER".equals(roleUpperCase)) {
            targetRole = Roles.ROLE_CARRIER;
        } else if ("DRIVER".equals(roleUpperCase)) {
            targetRole = Roles.ROLE_DRIVER;
        } else {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Rôle invalide: " + command.role() + " (attendu: CARRIER ou DRIVER)");
        }

        if (userRepository.existsByEmail(command.email())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email déjà utilisé");
        }

        String username = (command.fullName() != null && !command.fullName().isBlank())
                ? command.fullName().trim()
                : command.email();

        if (userRepository.existsByUsername(username)) {
            username = command.email(); // fallback to email if name is taken
        }

        var role = roleRepository.findByName(targetRole)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, targetRole + " introuvable"));

        var newUser = new User(command.email(), username, hashingService.encode(command.password()), List.of(role));
        newUser.setEnabled(true);
        newUser.setStatus(AccountStatus.ACTIVE);

        var savedUser = userRepository.save(newUser);
        log.info("Compte {} créé directement par admin: {} ({})", targetRole, savedUser.getEmail(), savedUser.getUsername());
        publishUserCreatedEvent(savedUser, "admin-direct-create");
        return Optional.of(savedUser);
    }

    private void validateInviteCommand(InviteUserCommand command) {
        if (command.email() == null || command.email().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email requis");
        }
        if (command.role() == null || (!EnumSet.of(Roles.ROLE_CARRIER, Roles.ROLE_DRIVER, Roles.ROLE_ADMIN).contains(command.role()))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Création limitée aux profils Exploitant, Conducteur ou Administrateur");
        }
    }

    private String generateSecureToken() {
        byte[] buffer = new byte[48];
        secureRandom.nextBytes(buffer);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(buffer);
    }

    private String generateRandomSecret() {
        return UUID.randomUUID().toString() + "-seed";
    }

    private String safeTrim(String value) {
        return value == null ? null : value.trim();
    }

    private void assignResetToken(User user, String token, Duration ttl) {
        user.setResetTokenHash(hashingService.encode(token));
        user.setResetTokenSignature(tokenSignature(token));
        user.setResetTokenExpiry(Instant.now().plus(ttl));
        user.setResetTokenUsed(false);
        user.setResetTokenUsedAt(null);
    }

    private String tokenSignature(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : hash) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }

    @Override
    public Optional<User> handle(InviteUserCommand command) {
        validateInviteCommand(command);
        var role = roleRepository.findByName(command.role())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Rôle introuvable"));

        var existing = userRepository.findByEmail(command.email());
        User user = existing.orElseGet(() -> {
            var seedPassword = hashingService.encode(generateRandomSecret());
            return new User(command.email(), command.email(), seedPassword, List.of(role), command.createdBy());
        });

        if (user.getRoles() == null) {
            user.setRoles(new java.util.HashSet<>());
        }
        // Ensure we keep a placeholder password to satisfy DB constraints until activation sets the real one.
        if (user.getPassword() == null || user.getPassword().isBlank()) {
            user.setPassword(hashingService.encode(generateRandomSecret()));
        }
        if (user.getRoles().stream().noneMatch(r -> r.getName() == role.getName())) {
            user.addRole(role);
        }

        if (user.getStatus() != AccountStatus.ACTIVE) {
            user.setStatus(AccountStatus.INVITED);
        }
        user.setEnabled(true);
        user.setFullName(safeTrim(command.fullName()));
        user.setCity(safeTrim(command.city()));
        user.setCompany(safeTrim(command.company()));
        user.setFleetSize(command.fleetSize());
        user.setPhone(safeTrim(command.phone()));
        user.setVehicle(safeTrim(command.vehicle()));

        var token = generateSecureToken();
        assignResetToken(user, token, INVITE_TOKEN_TTL);

        var savedUser = userRepository.save(user);
        mailNotificationService.sendActivationEmail(savedUser.getEmail(), savedUser.getFullName(), token, savedUser.getResetTokenExpiry());
        log.info("Invitation générée pour {} avec rôle {} (existant? {})", savedUser.getEmail(), command.role(), existing.isPresent());
        return Optional.of(savedUser);
    }

    @Override
    public Optional<User> handle(ResendInviteCommand command) {
        if (command.userId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Identifiant requis");
        }
        var user = userRepository.findById(command.userId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));

        if (user.getStatus() == AccountStatus.DISABLED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Le compte est désactivé.");
        }

        var token = generateSecureToken();
        assignResetToken(user, token, INVITE_TOKEN_TTL);
        if (user.getStatus() != AccountStatus.ACTIVE) {
            user.setStatus(AccountStatus.INVITED);
        }
        user.setEnabled(true);
        var savedUser = userRepository.save(user);
        mailNotificationService.sendActivationEmail(savedUser.getEmail(), savedUser.getFullName(), token, savedUser.getResetTokenExpiry());
        log.info("Invitation renvoyée pour {}", savedUser.getEmail());
        return Optional.of(savedUser);
    }

    @Override
    public Optional<User> handle(ResetPasswordWithTokenCommand command) {
        if (command.token() == null || command.token().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Jeton requis");
        }
        if (command.newPassword() == null || command.newPassword().length() < 8) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mot de passe trop court (8 caractères minimum)");
        }

        var signature = tokenSignature(command.token());
        var user = userRepository.findByResetTokenSignature(signature)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Lien expiré ou invalide"));

        if (user.getResetTokenExpiry() == null || Instant.now().isAfter(user.getResetTokenExpiry())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Lien expiré ou invalide");
        }
        if (user.isResetTokenUsed()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Lien déjà utilisé");
        }
        if (user.getResetTokenHash() == null || !hashingService.matches(command.token(), user.getResetTokenHash())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Lien expiré ou invalide");
        }

        user.setPassword(hashingService.encode(command.newPassword()));
        user.setStatus(AccountStatus.ACTIVE);
        user.setEnabled(true);
        user.setResetTokenUsed(true);
        user.setResetTokenUsedAt(Instant.now());
        user.setResetTokenHash(null);
        user.setResetTokenSignature(null);
        user.setResetTokenExpiry(null);

        var savedUser = userRepository.save(user);
        mailNotificationService.sendPasswordChangedEmail(savedUser.getEmail(), savedUser.getFullName());
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
