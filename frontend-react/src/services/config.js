export const API_BASE_URL = '/api';

export const ENDPOINTS = {
  signin: '/v1/auth/signin',
  resetPassword: '/v1/auth/reset-password',
  adminUsers: '/v1/admin/users',
  adminAdmins: '/v1/admin/users/admins',
  adminCreateUser: '/v1/admin/users/create',
  adminResendInvite: (userId) => `/v1/admin/users/${userId}/resend-invite`,
  adminToggleUserEnabled: (userId) => `/v1/admin/users/${userId}/enabled`,
  // Vehicles admin endpoints
  adminVehicles: '/v1/vehicles/admin/all',
  adminCreateVehicle: '/v1/vehicles/admin/create',
};
