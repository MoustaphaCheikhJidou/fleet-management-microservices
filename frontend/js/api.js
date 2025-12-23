import {
  SIGN_UP_ENDPOINT,
  SIGN_IN_ENDPOINT,
  ADMIN_USERS_ENDPOINT,
  ADMIN_ADMINS_ENDPOINT,
  ADMIN_CREATE_ENDPOINT,
  ADMIN_STATUS_ENDPOINT,
} from './config.js';

function buildNetworkError(url, originalError) {
  const error = new Error(`Connexion impossible vers ${url}: ${originalError.message}`);
  error.url = url;
  error.status = 'NETWORK';
  error.cause = originalError;
  error.backendMessage = originalError.message;
  return error;
}

async function safeFetch(url, options = {}) {
  const method = options?.method || 'GET';
  console.info('[API] fetch', { url, method });
  try {
    const response = await fetch(url, options);
    console.info('[API] response', { url: response.url, method, status: response.status, ok: response.ok });
    return response;
  } catch (err) {
    console.error('[API] network error', { url, method, message: err.message });
    throw buildNetworkError(url, err);
  }
}

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
  const snippet = text?.slice(0, 300) || '';
  console.info('[API] payload', {
    url: response.url,
    status: response.status,
    ok: response.ok,
    bodyPreview: snippet,
  });

  if (!response.ok) {
    const backendMessage = payload?.message || payload?.error || text || 'Une erreur est survenue.';
    const diagnostics = `HTTP ${response.status} ${response.statusText || ''}`.trim();
    const error = new Error(`${diagnostics} sur ${response.url} — ${backendMessage}`);
    error.status = response.status;
    error.statusText = response.statusText;
    error.url = response.url;
    error.backendMessage = backendMessage;
    error.body = text;
    error.bodyPreview = snippet;
    error.payload = payload;
    throw error;
  }

  return payload;
}

export async function signUpRequest(data) {
  const response = await safeFetch(SIGN_UP_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  return handleResponse(response);
}

export async function signInRequest(data) {
  const response = await safeFetch(SIGN_IN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  const payload = await handleResponse(response);
  return { ...payload, __httpStatus: response.status };
}

function authFetch(url, token, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return safeFetch(url, { ...options, headers });
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
