package com.iam.service.interfaces.rest.resources;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.Optional;

/**
 * Payload used to invite a user (operator or driver).
 */
public record InviteUserResource(
                @NotBlank @Email String email,
                String fullName,
                String role,
                String city,
                String company,
                Integer fleetSize,
                String phone,
                String vehicle,
                @JsonIgnoreProperties(ignoreUnknown = true) Metadata metadata
) {
        /**
         * Nested metadata payload for backward-compatible invites.
         */
        public record Metadata(String city, String company, Integer fleetSize, String phone, String vehicle) {
        }

        public String resolvedCity() {
                return Optional.ofNullable(city).orElseGet(() -> metadata != null ? metadata.city() : null);
        }

        public String resolvedCompany() {
                return Optional.ofNullable(company).orElseGet(() -> metadata != null ? metadata.company() : null);
        }

        public Integer resolvedFleetSize() {
                return Optional.ofNullable(fleetSize).orElseGet(() -> metadata != null ? metadata.fleetSize() : null);
        }

        public String resolvedPhone() {
                return Optional.ofNullable(phone).orElseGet(() -> metadata != null ? metadata.phone() : null);
        }

        public String resolvedVehicle() {
                return Optional.ofNullable(vehicle).orElseGet(() -> metadata != null ? metadata.vehicle() : null);
        }
}
