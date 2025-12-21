import { signUpRequest } from './api.js';

const form = document.getElementById('signupForm');
const status = document.getElementById('signupStatus');
const roleSelect = document.getElementById('signupRole');

const ROLES = {
  CARRIER: 'ROLE_CARRIER',
  DRIVER: 'ROLE_DRIVER',
};
const ALLOWED_ROLES = [ROLES.CARRIER, ROLES.DRIVER];

function resolveRole(rawRole) {
  if (!rawRole) {
    return ROLES.CARRIER;
  }

  const normalized = rawRole.trim().toUpperCase();
  return ALLOWED_ROLES.includes(normalized) ? normalized : ROLES.CARRIER;
}

function setStatus(message, isError = false) {
  status.textContent = message;
  status.style.color = isError ? '#dc3545' : 'var(--text)';
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(form);
  const payload = {
    email: formData.get('email'),
    password: formData.get('password'),
    roles: [resolveRole(formData.get('role'))],
  };

  setStatus('Création du compte en cours…');

  try {
    const result = await signUpRequest(payload);
    const selectedLabel = roleSelect?.selectedOptions?.[0]?.textContent ?? 'profil';
    setStatus(`Compte ${selectedLabel.toLowerCase()} créé pour ${result.email}. Vous pouvez maintenant vous connecter.`);
    form.reset();
    if (roleSelect) {
      roleSelect.value = ROLES.CARRIER;
    }
  } catch (error) {
    setStatus(error.message || 'Création impossible.', true);
  }
});
