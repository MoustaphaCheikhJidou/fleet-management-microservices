export const API_BASE_URL = '/api';

export const ENDPOINTS = {
  signin: '/v1/auth/signin',
  resetPassword: '/v1/auth/reset-password',
  adminUsers: '/v1/admin/users',
  adminAdmins: '/v1/admin/users/admins',
  adminResendInvite: (userId) => `/v1/admin/users/${userId}/resend-invite`,
};
