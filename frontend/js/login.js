import { signInRequest } from './api.js';
import { saveSession, resolveLandingRoute } from './session.js';

const form = document.getElementById('loginForm');
const status = document.getElementById('loginStatus');

function setStatus(message, isError = false) {
  status.textContent = message;
  status.style.color = isError ? '#dc3545' : 'var(--text)';
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(form);
  const email = formData.get('email');
  const password = formData.get('password');

  setStatus('Connexion en cours…');

  try {
    const result = await signInRequest({ email, password });
    if (result?.token) {
      saveSession(result.email, result.token);
      const destination = resolveLandingRoute(result.roles);
      const label = destination.includes('admin') ? 'le portail administrateur' : 'le tableau de bord';
      setStatus(`Authentification réussie. Redirection vers ${label}…`);
      setTimeout(() => {
        window.location.href = destination;
      }, 500);
    } else {
      setStatus('Réponse inattendue : jeton absent.', true);
    }
  } catch (error) {
    setStatus(error.message || 'Authentification impossible.', true);
  }
});
