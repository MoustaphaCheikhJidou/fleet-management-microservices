import { TOKEN_STORAGE_KEY, EMAIL_STORAGE_KEY } from './config.js';

export function saveSession(email, token) {
  if (email) {
    localStorage.setItem(EMAIL_STORAGE_KEY, email);
  }
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  }
}

export function clearSession() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(EMAIL_STORAGE_KEY);
}

export function getToken() {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function getEmail() {
  return localStorage.getItem(EMAIL_STORAGE_KEY);
}

function decodeTokenPayload(token) {
  if (!token) {
    return null;
  }

  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) {
      return null;
    }
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join(''),
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.warn('Impossible de décoder le token JWT', error);
    return null;
  }
}

export function getDecodedToken() {
  return decodeTokenPayload(getToken());
}

export function getRoles() {
  const payload = getDecodedToken();
  return Array.isArray(payload?.roles) ? payload.roles : [];
}

export function hasRole(role) {
  return getRoles().includes(role);
}

export function resolveLandingRoute(roles = getRoles()) {
  if (!Array.isArray(roles) || roles.length === 0) {
    return 'dashboard.html';
  }
  return roles.includes('ROLE_ADMIN') ? 'admin-dashboard.html' : 'dashboard.html';
}

export function requireSession() {
  const token = getToken();
  if (!token) {
    window.location.href = 'login.html';
  }
  return token;
}
