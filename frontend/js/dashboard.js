import { API_BASE_URL } from './config.js';
import {
  clearSession,
  getEmail,
  getToken,
  requireSession,
  getRoles,
  hasRole,
  getDecodedToken,
} from './session.js';
import {
  fetchAdminUsers,
  fetchAdminsOnly,
  createAdminUserRequest,
  updateUserStatusRequest,
} from './api.js';

const token = requireSession();
const roles = getRoles();
const isAdmin = hasRole('ROLE_ADMIN');
const pageKind = document.body?.dataset?.page || 'default';

if (pageKind === 'admin' && !isAdmin) {
  window.location.href = 'dashboard.html';
}

const emailLabel = document.getElementById('userEmail');
const roleBadges = document.getElementById('roleBadges');
const tokenPreview = document.getElementById('tokenPreview');
const logoutBtn = document.getElementById('logoutBtn');
const healthBtn = document.getElementById('healthBtn');
const healthResult = document.getElementById('healthResult');
const adminBoard = document.getElementById('adminBoard');
const createAdminForm = document.getElementById('createAdminForm');
const adminFormStatus = document.getElementById('adminFormStatus');
const adminUsersBody = document.getElementById('adminUsersBody');
const adminUsersStatus = document.getElementById('adminUsersStatus');
const refreshUsersBtn = document.getElementById('refreshUsersBtn');
const adminUsersCount = document.getElementById('adminUsersCount');
const adminEnabledCount = document.getElementById('adminEnabledCount');
const adminOnlyBody = document.getElementById('adminOnlyBody');
const adminOnlyStatus = document.getElementById('adminOnlyStatus');
const refreshAdminsBtn = document.getElementById('refreshAdminsBtn');
const adminOnlyCount = document.getElementById('adminOnlyCount');
const roleAwareSections = document.querySelectorAll('[data-visible-for]');
const adminToast = document.getElementById('adminToast');
let toastTimeoutId;

emailLabel.textContent = getEmail() || 'Utilisateur connecté';

const tokenSnippet = `${token.slice(0, 16)}…${token.slice(-10)}`;
if (tokenPreview) {
  tokenPreview.textContent = tokenSnippet;
}

function renderRoles() {
  if (!roleBadges) {
    return;
  }
  roleBadges.innerHTML = roles.length
    ? roles.map((role) => `<li>${role.replace('ROLE_', '')}</li>`).join('')
    : '<li>Aucun rôle</li>';
}

renderRoles();

function applyRoleVisibility() {
  if (!roleAwareSections.length) {
    return;
  }

  roleAwareSections.forEach((section) => {
    const rawRoles = section.getAttribute('data-visible-for');
    if (!rawRoles) {
      return;
    }
    const allowedRoles = rawRoles
      .split(',')
      .map((role) => role.trim())
      .filter(Boolean);

    const shouldDisplay = allowedRoles.some((role) => roles.includes(role));
    section.hidden = !shouldDisplay;
  });
}

logoutBtn?.addEventListener('click', () => {
  clearSession();
  window.location.href = 'login.html';
});

function showToast(message, tone = 'info') {
  if (!adminToast) {
    return;
  }
  adminToast.textContent = message;
  adminToast.dataset.tone = tone;
  adminToast.hidden = false;
  adminToast.classList.remove('is-visible');
  // Force reflow to restart animation
  void adminToast.offsetWidth;
  adminToast.classList.add('is-visible');
  clearTimeout(toastTimeoutId);
  toastTimeoutId = window.setTimeout(() => {
    adminToast.classList.remove('is-visible');
    window.setTimeout(() => {
      adminToast.hidden = true;
    }, 250);
  }, 4000);
}

adminToast?.addEventListener('click', () => {
  adminToast.classList.remove('is-visible');
  adminToast.hidden = true;
  clearTimeout(toastTimeoutId);
});

healthBtn?.addEventListener('click', async () => {
  healthBtn.disabled = true;
  if (healthResult) {
    healthResult.textContent = 'Requête en cours…';
  }

  try {
    const response = await fetch(`${API_BASE_URL}/actuator/health`, {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload?.message || 'Erreur API');
    }

    if (healthResult) {
      healthResult.textContent = JSON.stringify(payload, null, 2);
    }
    showToast('Health check réussi sur Gateway.', 'success');
  } catch (error) {
    if (healthResult) {
      healthResult.textContent = error.message || 'Impossible de contacter l’API';
    }
    showToast(error.message || 'Health check en échec.', 'error');
  } finally {
    healthBtn.disabled = false;
  }
});

function toggleAdminBoard() {
  if (!adminBoard) {
    return;
  }
  if (isAdmin) {
    adminBoard.hidden = false;
  } else {
    adminBoard.hidden = true;
  }
}

toggleAdminBoard();
applyRoleVisibility();

function updateAdminCounters(users = []) {
  if (!isAdmin) {
    return;
  }

  if (adminUsersCount) {
    adminUsersCount.textContent = users.length;
  }

  if (adminEnabledCount) {
    const enabledCount = users.filter((user) => user.enabled).length;
    adminEnabledCount.textContent = enabledCount;
  }
}

function renderUsers(users = []) {
  if (!adminUsersBody) {
    return;
  }

  if (!users.length) {
    adminUsersBody.innerHTML = `<tr><td colspan="6">Aucun utilisateur enregistré.</td></tr>`;
    return;
  }

  adminUsersBody.innerHTML = users
    .map((user) => {
      const { id, username, email, roles: userRoles, enabled } = user;
      const badgeClass = enabled ? 'badge badge--success' : 'badge badge--danger';
      const nextLabel = enabled ? 'Suspendre' : 'Activer';
      return `
        <tr>
          <td>${id ?? '—'}</td>
          <td>${username ?? '—'}</td>
          <td>${email}</td>
          <td>${(userRoles ?? []).join(', ') || '—'}</td>
          <td><span class="${badgeClass}">${enabled ? 'Actif' : 'Suspendu'}</span></td>
          <td>
            <button class="ghost-button" data-action="toggle-status" data-user-id="${id}" data-enabled="${enabled}" data-email="${email}">${nextLabel}</button>
          </td>
        </tr>
      `;
    })
    .join('');
}

function renderAdminsOnly(admins = []) {
  if (!adminOnlyBody) {
    return;
  }

  if (!admins.length) {
    adminOnlyBody.innerHTML = '<tr><td colspan="4">Aucun administrateur provisionné.</td></tr>';
    if (adminOnlyCount) {
      adminOnlyCount.textContent = '0';
    }
    return;
  }

  adminOnlyBody.innerHTML = admins
    .map((admin) => {
      const { id, email, username, enabled } = admin;
      const tone = enabled ? 'badge badge--success' : 'badge badge--danger';
      return `
        <tr>
          <td>${id ?? '—'}</td>
          <td>${username ?? '—'}</td>
          <td>${email}</td>
          <td><span class="${tone}">${enabled ? 'Actif' : 'Suspendu'}</span></td>
        </tr>
      `;
    })
    .join('');

  if (adminOnlyCount) {
    adminOnlyCount.textContent = String(admins.length);
  }
}

async function loadAdminUsers(options = {}) {
  if (!isAdmin || !adminUsersStatus) {
    return;
  }

  const { silent = false } = options;

  adminUsersStatus.textContent = 'Chargement des comptes…';
  try {
    const users = await fetchAdminUsers(token);
    adminUsersStatus.textContent = `${users.length} comptes trouvés.`;
    renderUsers(users);
    updateAdminCounters(users);
    if (!silent) {
      showToast('Liste des utilisateurs mise à jour.', 'success');
    }
  } catch (error) {
    adminUsersStatus.textContent = error.message || 'Impossible de récupérer les utilisateurs.';
    showToast(error.message || 'Erreur lors du chargement des utilisateurs.', 'error');
  }
}

async function loadAdminsOnly(options = {}) {
  if (!isAdmin || !adminOnlyStatus) {
    return;
  }

  const { silent = false } = options;

  adminOnlyStatus.textContent = 'Chargement des administrateurs…';
  try {
    const admins = await fetchAdminsOnly(token);
    adminOnlyStatus.textContent = `${admins.length} administrateurs trouvés.`;
    renderAdminsOnly(admins);
    if (!silent) {
      showToast('Liste des administrateurs mise à jour.', 'success');
    }
  } catch (error) {
    adminOnlyStatus.textContent = error.message || 'Impossible de récupérer les administrateurs.';
    showToast(error.message || 'Erreur lors du chargement des administrateurs.', 'error');
  }
}

if (isAdmin) {
  loadAdminUsers({ silent: true });
  loadAdminsOnly({ silent: true });
}

createAdminForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!isAdmin) {
    return;
  }

  const formData = new FormData(event.currentTarget);
  const payload = {
    username: formData.get('username'),
    email: formData.get('email'),
    password: formData.get('password'),
  };

  adminFormStatus.textContent = 'Création en cours…';

  try {
    await createAdminUserRequest(token, payload);
    adminFormStatus.textContent = `Administrateur ${payload.email} créé.`;
    event.currentTarget.reset();
    showToast(`Administrateur ${payload.email} créé.`, 'success');
    await Promise.all([
      loadAdminUsers({ silent: true }),
      loadAdminsOnly({ silent: true }),
    ]);
  } catch (error) {
    adminFormStatus.textContent = error.message || 'Impossible de créer l’administrateur.';
    showToast(error.message || 'Création impossible.', 'error');
  }
});

adminUsersBody?.addEventListener('click', async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  if (target.dataset.action !== 'toggle-status') {
    return;
  }

  const userId = target.dataset.userId;
  if (!userId) {
    return;
  }

  const enabled = target.dataset.enabled === 'true';
  const email = target.dataset.email;
  target.disabled = true;
  target.textContent = 'Mise à jour…';

  try {
    await updateUserStatusRequest(token, userId, !enabled);
    const nextState = !enabled ? 'activé' : 'suspendu';
    showToast(`Compte ${email || userId} ${nextState}.`, 'success');
    await Promise.all([
      loadAdminUsers({ silent: true }),
      loadAdminsOnly({ silent: true }),
    ]);
  } catch (error) {
    adminUsersStatus.textContent = error.message || 'Impossible de mettre à jour le statut.';
    showToast(error.message || 'Mise à jour impossible.', 'error');
  } finally {
    target.disabled = false;
  }
});

refreshUsersBtn?.addEventListener('click', () => {
  loadAdminUsers();
});

refreshAdminsBtn?.addEventListener('click', () => {
  loadAdminsOnly();
});

// Afficher les métadonnées token dans la console pour faciliter le debug local.
const decodedToken = getDecodedToken();
if (decodedToken) {
  console.info('JWT décodé (debug):', decodedToken);
}
