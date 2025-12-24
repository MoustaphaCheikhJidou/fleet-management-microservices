package com.vehicles.service.interfaces.rest.resources;

/**
 * Resource for admin-initiated vehicle creation.
 * Allows specifying the manager ID explicitly.
 */
public record CreateVehicleAdminResource(String licensePlate, String brand, String model, Long managerId) {
    public CreateVehicleAdminResource {
        if (licensePlate == null || licensePlate.isBlank()) {
            throw new IllegalArgumentException("License plate cannot be null or blank");
        }
        if (brand == null || brand.isBlank()) {
            throw new IllegalArgumentException("Brand cannot be null or blank");
        }
        if (model == null || model.isBlank()) {
            throw new IllegalArgumentException("Model cannot be null or blank");
        }
        if (managerId == null) {
            throw new IllegalArgumentException("Manager ID cannot be null");
        }
    }
}
