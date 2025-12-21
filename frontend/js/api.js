import {
  SIGN_UP_ENDPOINT,
  SIGN_IN_ENDPOINT,
  ADMIN_USERS_ENDPOINT,
  ADMIN_ADMINS_ENDPOINT,
  ADMIN_CREATE_ENDPOINT,
  ADMIN_STATUS_ENDPOINT,
} from './config.js';

async function parseJson(text) {
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    console.warn('Réponse JSON invalide', error);
    return {};
  }
}

async function handleResponse(response) {
  const text = await response.text();
  const payload = await parseJson(text);

  if (!response.ok) {
    const message = payload?.message || payload?.error || 'Une erreur est survenue.';
    throw new Error(message);
  }

  return payload;
}

export async function signUpRequest(data) {
  const response = await fetch(SIGN_UP_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  return handleResponse(response);
}

export async function signInRequest(data) {
  const response = await fetch(SIGN_IN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  return handleResponse(response);
}

function authFetch(url, token, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return fetch(url, { ...options, headers });
}

export async function fetchAdminUsers(token) {
  const response = await authFetch(ADMIN_USERS_ENDPOINT, token, { method: 'GET' });
  return handleResponse(response);
}

export async function fetchAdminsOnly(token) {
  const response = await authFetch(ADMIN_ADMINS_ENDPOINT, token, { method: 'GET' });
  return handleResponse(response);
}

export async function createAdminUserRequest(token, payload) {
  const response = await authFetch(ADMIN_CREATE_ENDPOINT, token, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return handleResponse(response);
}

export async function updateUserStatusRequest(token, userId, enabled) {
  const response = await authFetch(ADMIN_STATUS_ENDPOINT(userId), token, {
    method: 'PATCH',
    body: JSON.stringify({ enabled }),
  });
  return handleResponse(response);
}
