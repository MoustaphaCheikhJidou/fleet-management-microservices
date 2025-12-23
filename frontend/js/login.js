import { signInRequest } from './api.js';
import { SIGN_IN_ENDPOINT } from './config.js';
import { saveSession, resolveLandingRoute } from './session.js';

const ADMIN_ROLE = 'ROLE_ADMIN';
const ROLE_COOKIE_NAME = 'role';
const ROLE_FALLBACK_VALUE = 'ROLE_USER';
const form = document.getElementById('loginForm');
const status = document.getElementById('loginStatus');
const NETWORK_STATUS = 'NETWORK';
const STATUS_COPY = {
  401: 'Email ou mot de passe incorrect.',
  403: 'Accès refusé.',
  404: 'Service indisponible. Réessayez.',
  NETWORK: 'Problème de connexion. Vérifiez votre réseau.',
};

function setRoleCookie(isAdmin) {
  try {
    const value = isAdmin ? ADMIN_ROLE : ROLE_FALLBACK_VALUE;
    document.cookie = `${ROLE_COOKIE_NAME}=${value}; Path=/; SameSite=Lax`;
  } catch (error) {
    console.warn('Impossible de positionner le cookie role', error);
  }
}

function setStatus(message, isError = false) {
  status.textContent = message;
  status.style.color = isError ? '#dc3545' : 'var(--text)';
}

function formatUserMessage(error) {
  if (typeof error?.status === 'number' && STATUS_COPY[error.status]) {
    return STATUS_COPY[error.status];
  }

  if (error?.status === NETWORK_STATUS) {
    return STATUS_COPY[NETWORK_STATUS];
  }

  return 'Impossible de vous connecter pour le moment. Réessayez dans un instant.';
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(form);
  const email = formData.get('email');
  const password = formData.get('password');

  setStatus('Connexion en cours…');
  console.log('SIGNIN_URL=', SIGN_IN_ENDPOINT);
  console.log('[LOGIN] POST', SIGN_IN_ENDPOINT);
  console.info('[LOGIN] SIGN_IN_ENDPOINT résolu', SIGN_IN_ENDPOINT);
  console.info('[LOGIN] Tentative de connexion', { endpoint: SIGN_IN_ENDPOINT, email });

  try {
    const result = await signInRequest({ email, password });
    const statusCode = typeof result?.__httpStatus === 'number' ? result.__httpStatus : 200;
    const roles = Array.isArray(result?.roles) ? result.roles : [];
    console.log('[LOGIN] status=', statusCode, 'roles=', roles);
    if (result?.token) {
      const hasAdminRole = roles.includes(ADMIN_ROLE);
      setRoleCookie(hasAdminRole);
      saveSession(result.email, result.token);
      const destination = resolveLandingRoute(roles);
      setStatus('Authentification réussie. Redirection en cours…');
      setTimeout(() => {
        window.location.href = destination;
      }, 500);
    } else {
      setStatus('Réponse inattendue : jeton absent.', true);
    }
  } catch (error) {
    const failingUrl = error?.url || SIGN_IN_ENDPOINT;
    const statusLabel = typeof error?.status === 'number' ? error.status : error?.status || NETWORK_STATUS;
    const diagnosticMessage = error?.backendMessage || error?.message || 'Authentification impossible.';
    console.error('[LOGIN] Echec de connexion', {
      url: failingUrl,
      status: statusLabel,
      backendMessage: diagnosticMessage,
      stack: error?.stack,
    });
    const userFacingMessage = formatUserMessage(error);
    setStatus(userFacingMessage, true);
  }
});
