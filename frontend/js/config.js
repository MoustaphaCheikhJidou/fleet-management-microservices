export const API_BASE_URL = 'http://localhost:8080';
export const SIGN_UP_ENDPOINT = `${API_BASE_URL}/api/v1/auth/signup`;
export const SIGN_IN_ENDPOINT = `${API_BASE_URL}/api/v1/auth/signin`;
export const ADMIN_USERS_ENDPOINT = `${API_BASE_URL}/api/v1/admin/users`;
export const ADMIN_ADMINS_ENDPOINT = `${ADMIN_USERS_ENDPOINT}/admins`;
export const ADMIN_CREATE_ENDPOINT = `${ADMIN_USERS_ENDPOINT}`;
export const ADMIN_STATUS_ENDPOINT = (userId) => `${ADMIN_USERS_ENDPOINT}/${userId}/enabled`;
export const TOKEN_STORAGE_KEY = 'fleet-token';
export const EMAIL_STORAGE_KEY = 'fleet-email';
