package com.iam.service.application.internal.bootstrap;

import com.iam.service.domain.model.aggregates.User;
import com.iam.service.domain.model.entities.Role;
import com.iam.service.domain.model.commands.SeedRolesCommand;
import com.iam.service.domain.model.valueobjects.Roles;
import com.iam.service.domain.services.RoleCommandService;
import com.iam.service.infrastructure.persistence.jpa.repositories.RoleRepository;
import com.iam.service.infrastructure.persistence.jpa.repositories.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;

/**
 * Seeds the default administrator account if it does not exist.
 */
@Component
public class AdminUserSeeder implements ApplicationRunner {

    private static final Logger LOGGER = LoggerFactory.getLogger(AdminUserSeeder.class);

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final RoleCommandService roleCommandService;
    private final PasswordEncoder passwordEncoder;
    private final String adminUsername;
    private final String adminEmail;
    private final String adminPassword;

    public AdminUserSeeder(UserRepository userRepository,
                           RoleRepository roleRepository,
                           RoleCommandService roleCommandService,
                           PasswordEncoder passwordEncoder,
                           @Value("${iam.superadmin.username:${SUPERADMIN_USERNAME:admin}}") String adminUsername,
                           @Value("${iam.superadmin.email:${SUPERADMIN_EMAIL:admin1@gmail.com}}") String adminEmail,
                           @Value("${iam.superadmin.password:${SUPERADMIN_PASSWORD:Ma@22117035}}") String adminPassword) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.roleCommandService = roleCommandService;
        this.passwordEncoder = passwordEncoder;
        this.adminUsername = adminUsername;
        this.adminEmail = adminEmail;
        this.adminPassword = adminPassword;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        LOGGER.info("Resolving SuperAdmin bootstrap parameters from environment overrides.");
        if (!StringUtils.hasText(adminEmail) || !StringUtils.hasText(adminPassword)) {
            LOGGER.warn("Admin bootstrap skipped: missing credentials configuration");
            return;
        }

        LOGGER.info("Ensuring SuperAdmin bootstrap for {}", adminEmail);

        roleCommandService.handle(new SeedRolesCommand());

        var adminRole = roleRepository.findByName(Roles.ROLE_ADMIN)
                .orElseThrow(() -> new IllegalStateException("ROLE_ADMIN is not seeded"));

        var existingAdmin = userRepository.findByEmail(adminEmail);
        if (existingAdmin.isPresent()) {
            var admin = existingAdmin.get();
            boolean updated = refreshAdminMetadata(admin, adminRole);
            if (updated) {
                userRepository.save(admin);
                LOGGER.info("SuperAdmin exists - metadata refreshed for {}", adminEmail);
            } else {
                LOGGER.info("SuperAdmin exists: {}", adminEmail);
            }
            return;
        }

        var admin = new User(adminEmail, adminUsername, passwordEncoder.encode(adminPassword), List.of(adminRole));
        userRepository.save(admin);
        LOGGER.info("SuperAdmin created with email {}", adminEmail);
    }

    private boolean refreshAdminMetadata(User admin, Role adminRole) {
        boolean changed = false;

        if (admin.getRoles().stream().noneMatch(role -> role.getName() == Roles.ROLE_ADMIN)) {
            admin.addRole(adminRole);
            changed = true;
        }

        if (!admin.isEnabled()) {
            admin.setEnabled(true);
            changed = true;
        }

        if (StringUtils.hasText(adminUsername) && !adminUsername.equals(admin.getUsername())) {
            admin.setUsername(adminUsername);
            changed = true;
        }

        if (StringUtils.hasText(adminPassword) && !passwordEncoder.matches(adminPassword, admin.getPassword())) {
            admin.setPassword(passwordEncoder.encode(adminPassword));
            changed = true;
        }

        return changed;
    }
}