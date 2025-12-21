package com.iam.service.infrastructure.persistence.jpa.repositories;

import com.iam.service.domain.model.aggregates.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * User repository.
 * <p>
 *     This interface is used to interact with the database to perform CRUD operations on the User entity.
 *     It additionally provides a method to find a user by its username and to check if a user with a given username exists.
 * </p>
 */
@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    /**
     * Find a user by its email.
     *
     * @param email the email of the user to find.
     * @return an optional containing the user if it exists, an empty optional otherwise.
     */
    Optional<User> findByEmail(String email);

    /**
     * Check if a user with a given email exists.
     *
     * @param email the email of the user to check.
     * @return true if a user with the given email exists, false otherwise.
     */
    boolean existsByEmail(String email);

    /**
     * Find a user by username.
     *
     * @param username the username to search for.
     * @return an optional containing the user if it exists.
     */
    Optional<User> findByUsername(String username);

    /**
     * Check if a username already exists.
     *
     * @param username the username to check.
     * @return true if the username already exists.
     */
    boolean existsByUsername(String username);
}
