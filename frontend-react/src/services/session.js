const STORAGE_KEY = 'fleet-react-session';
const BANNER_KEY = 'fleet-react-guard-banner';

function getStore() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.warn('Lecture session impossible', error);
    return {};
  }
}

function normalizeRoles(input) {
  const raw = input?.roles ?? input ?? [];
  if (Array.isArray(raw)) return raw.filter(Boolean);
  if (typeof raw === 'string') return raw ? [raw] : [];
  return [];
}

function writeStore(data) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('Écriture session impossible', error);
  }
}

export function setSession({ token, email, roles = [] }) {
  writeStore({ token, email, roles });
}

export function clearSession() {
  writeStore({});
}

export function getToken() {
  return getStore().token || null;
}

export function getEmail() {
  return getStore().email || '';
}

export function getRoles() {
  return normalizeRoles(getStore());
}

export function hasRole(role, session) {
  return normalizeRoles(session ?? getStore()).includes(role);
}

export function getSession() {
  return getStore();
}

export function isAdmin(session) {
  return hasRole('ROLE_ADMIN', session);
}

export function isDriver(session) {
  return hasRole('ROLE_DRIVER', session);
}

export function isCarrier(session) {
  return hasRole('ROLE_CARRIER', session);
}

export function getUserLabel(session) {
  if (isAdmin(session)) return 'Administrateur';
  if (isCarrier(session)) return 'Exploitant';
  if (isDriver(session)) return 'Conducteur';
  return 'Utilisateur';
}

export function isAuthed() {
  return Boolean(getToken());
}

export function logout() {
  clearSession();
  setGuardBanner('');
}

export function setGuardBanner(message) {
  try {
    if (message) {
      window.sessionStorage.setItem(BANNER_KEY, message);
    } else {
      window.sessionStorage.removeItem(BANNER_KEY);
    }
  } catch (error) {
    console.warn('Impossible de stocker la bannière', error);
  }
}

export function consumeGuardBanner() {
  try {
    const message = window.sessionStorage.getItem(BANNER_KEY);
    if (message) {
      window.sessionStorage.removeItem(BANNER_KEY);
    }
    return message || '';
  } catch (error) {
    console.warn('Impossible de lire la bannière', error);
    return '';
  }
}
