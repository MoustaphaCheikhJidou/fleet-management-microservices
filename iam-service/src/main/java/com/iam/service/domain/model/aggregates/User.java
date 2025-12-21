package com.iam.service.domain.model.aggregates;

import com.iam.service.domain.model.entities.Role;
import com.iam.service.shared.domain.model.aggregates.AuditableAbstractAggregateRoot;
import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Getter
@Setter
@Entity
public class User extends AuditableAbstractAggregateRoot<User> {
    @NotBlank
    @Email
    @Size(max = 100)
    @Column(unique = true)
    private String email;

    @NotBlank
    @Size(max = 60)
    @Column(unique = true)
    private String username;

    @NotBlank
    @Size(max = 120)
    private String password;

    @ManyToMany(fetch = FetchType.EAGER, cascade = CascadeType.ALL)
    @JoinTable(name = "user_roles",
            joinColumns = @JoinColumn(name = "user_id"),
            inverseJoinColumns = @JoinColumn(name = "role_id"))
    private Set<Role> roles;

    @Column(name = "created_by")
    private Long createdBy;

    @Column(nullable = false)
    private boolean enabled = true;

    /**
     * Default constructor.
     */
    public User() {
        this.roles = new HashSet<>();
    }

    /**
     * Constructor with email and password.
     *
     * @param email the email
     * @param password the password
     */
    public User(String email, String password) {
        this(email, email, password);
    }

    public User(String email, String username, String password) {
        this();
        this.email = email;
        this.username = (username == null || username.isBlank()) ? email : username;
        this.password = password;
        this.roles = new HashSet<>();
    }

    /**
     * Constructor with email, password and roles.
     *
     * @param email the email
     * @param password the password
     * @param roles the roles
     */
    public User(String email, String password, List<Role> roles) {
        this(email, email, password);
        addRoles(roles);
    }

    public User(String email, String username, String password, List<Role> roles) {
        this(email, username, password);
        addRoles(roles);
    }

    /**
     * Constructor with email, password, roles and createdBy.
     *
     * @param email the email
     * @param password the password
     * @param roles the roles
     * @param createdBy the ID of the manager who created this user (for carriers)
     */
    public User(String email, String password, List<Role> roles, Long createdBy) {
        this(email, password, roles);
        this.createdBy = createdBy;
    }

    public User(String email, String username, String password, List<Role> roles, Long createdBy) {
        this(email, username, password, roles);
        this.createdBy = createdBy;
    }

    /**
     * Add a role to the user.
     *
     * @param role the role
     * @return the {@link User} user
     */
    public User addRole(Role role) {
        this.roles.add(role);
        return this;
    }

    /**
     * Add a set of roles to the user.
     *
     * @param roles the roles
     * @return the {@link User} user
     */
    public User addRoles(List<Role> roles) {
        var validatedRoles = Role.validateRoleSet(roles);
        this.roles.addAll(validatedRoles);
        return this;
    }
}
