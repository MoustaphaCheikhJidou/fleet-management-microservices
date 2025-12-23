import {
  demoCarriers,
  getCarrierDashboardData,
  getDriverDashboardData,
  getAdminOverviewData,
} from './demo-data.js';
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

const ADMIN_ROLE = 'ROLE_ADMIN';
const ADMIN_GUARD_MESSAGE = 'Accès administrateur requis.';
const ROLE_COOKIE_NAME = 'role';
const token = requireSession();
const roles = getRoles() || [];
const isAdmin = hasRole(ADMIN_ROLE);
const ADMIN_GUARD_KEY = 'fleet-admin-guard-message';
const currentPath = typeof window !== 'undefined' ? window.location.pathname || '' : '';
const isAdminPage = document.body?.dataset?.page === 'admin' || currentPath.endsWith('/admin-dashboard.html');
const isDashboardPage =
  document.body?.dataset?.page === 'dashboard' ||
  currentPath.endsWith('/dashboard.html') ||
  currentPath === '/dashboard.html';

function pushAdminGuardMessage(message) {
  try {
    sessionStorage.setItem(ADMIN_GUARD_KEY, message);
  } catch (error) {
    console.warn('Impossible de stocker le message de garde admin', error);
  }
}

function consumeAdminGuardMessage() {
  try {
    const message = sessionStorage.getItem(ADMIN_GUARD_KEY);
    if (message) {
      sessionStorage.removeItem(ADMIN_GUARD_KEY);
    }
    return message;
  } catch (error) {
    console.warn('Impossible de lire le message de garde admin', error);
    return null;
  }
}

function resetRoleCookie() {
  try {
    document.cookie = `${ROLE_COOKIE_NAME}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
  } catch (error) {
    console.warn('Impossible de réinitialiser le cookie role', error);
  }
}

if (isAdminPage && !isAdmin) {
  console.info('[GUARD] admin forbidden -> redirect to dashboard.html');
  pushAdminGuardMessage(ADMIN_GUARD_MESSAGE);
  resetRoleCookie();
  window.location.replace('dashboard.html');
}

const emailLabel = document.getElementById('userEmail');
const roleBadges = document.getElementById('roleBadges');
const logoutBtn = document.getElementById('logoutBtn');
const adminBoard = document.getElementById('adminBoard');
const guardBanner = document.getElementById('guardBanner');
const dashboardSubtitle = document.getElementById('dashboardSubtitle');
const carrierSection = document.getElementById('carrierView');
const carrierSummary = document.getElementById('carrierSummary');
const carrierKpis = document.getElementById('carrierKpis');
const carrierAlertsChart = document.getElementById('carrierAlertsChart');
const carrierIncidentsChart = document.getElementById('carrierIncidentsChart');
const carrierAlertsTable = document.getElementById('carrierAlertsTable');
const carrierMissionsTable = document.getElementById('carrierMissionsTable');
const carrierActionsStatus = document.getElementById('carrierActionsStatus');
const quickActionButtons = document.querySelectorAll('.quick-actions__grid [data-action]');
const driverSection = document.getElementById('driverView');
const driverSummary = document.getElementById('driverSummary');
const driverKpis = document.getElementById('driverKpis');
const driverNextMission = document.getElementById('driverNextMission');
const driverHistoryList = document.getElementById('driverHistoryList');
const driverIncidentForm = document.getElementById('driverIncidentForm');
const driverIncidentStatus = document.getElementById('driverIncidentStatus');
const createAdminForm = document.getElementById('createAdminForm');
const adminFormStatus = document.getElementById('adminFormStatus');
const adminUsersBody = document.getElementById('adminUsersBody');
const adminUsersStatus = document.getElementById('adminUsersStatus');
const refreshUsersBtn = document.getElementById('refreshUsersBtn');
const adminOnlyBody = document.getElementById('adminOnlyBody');
const adminOnlyStatus = document.getElementById('adminOnlyStatus');
const refreshAdminsBtn = document.getElementById('refreshAdminsBtn');
const adminOnlyCount = document.getElementById('adminOnlyCount');
const adminTotalCarriers = document.getElementById('adminTotalCarriers');
const adminTotalDrivers = document.getElementById('adminTotalDrivers');
const adminTotalVehicles = document.getElementById('adminTotalVehicles');
const adminTotalAlerts = document.getElementById('adminTotalAlerts');
const adminTodayIncidents = document.getElementById('adminTodayIncidents');
const adminResolutionRate = document.getElementById('adminResolutionRate');
const adminAlertsChart = document.getElementById('adminAlertsChart');
const adminIncidentsChart = document.getElementById('adminIncidentsChart');
const adminActivityChart = document.getElementById('adminActivityChart');
const adminCriticalAlertsTable = document.getElementById('adminCriticalAlertsTable');
const adminRecentAccountsBody = document.getElementById('adminRecentAccountsBody');
const roleAwareSections = document.querySelectorAll('[data-visible-for]');
const adminToast = document.getElementById('adminToast');
let toastTimeoutId;

const signedInEmail = getEmail();
emailLabel.textContent = signedInEmail || 'Utilisateur connecté';

const guardMessage = isDashboardPage ? consumeAdminGuardMessage() : null;
if (guardBanner && guardMessage) {
  guardBanner.textContent = guardMessage;
  guardBanner.hidden = false;
}

const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
const requestedRole = searchParams.get('role');
const normalizedRequestedRole = typeof requestedRole === 'string' ? requestedRole.toLowerCase() : null;
const canViewCarrier = roles.includes('ROLE_CARRIER');
const canViewDriver = roles.includes('ROLE_DRIVER');
const shouldShowCarrierView =
  !isAdminPage && (normalizedRequestedRole === 'carrier' || (canViewCarrier && normalizedRequestedRole !== 'driver'));
const shouldShowDriverView =
  !isAdminPage && (normalizedRequestedRole === 'driver' || (!shouldShowCarrierView && canViewDriver));

if (dashboardSubtitle) {
  if (shouldShowCarrierView) {
    dashboardSubtitle.textContent = 'Pilotage du parc et des missions';
  } else if (shouldShowDriverView) {
    dashboardSubtitle.textContent = 'Suivi personnel des missions';
  } else {
    dashboardSubtitle.textContent = 'Pilotage du parc automobile';
  }
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

function toggleSection(section, shouldDisplay) {
  if (!section) {
    return;
  }
  section.hidden = !shouldDisplay;
  section.setAttribute('aria-hidden', String(!shouldDisplay));
}

function formatDateLabel(value) {
  if (!value) {
    return '—';
  }
  try {
    return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short' }).format(new Date(value));
  } catch (error) {
    return value;
  }
}

function renderKpiGrid(container, items = []) {
  if (!container) {
    return;
  }
  if (!items.length) {
    container.innerHTML = '<p class="field-note">Aucune donnée disponible.</p>';
    return;
  }
  container.innerHTML = items
    .map(
      (item) => `
        <article class="kpi-card">
          <p>${item.label}</p>
          <h3>${item.value}</h3>
        </article>
      `,
    )
    .join('');
}

function renderChart(container, data = []) {
  if (!container) {
    return;
  }
  if (!Array.isArray(data) || !data.length) {
    container.innerHTML = '<p class="chart__empty">Pas de données pour le moment.</p>';
    return;
  }
  const maxValue = Math.max(...data.map((point) => point.value || 0), 1);
  container.innerHTML = data
    .map(
      (point) => `
        <div class="chart__item" style="--value:${(point.value / maxValue) * 100}%">
          <span class="chart__value">${point.value}</span>
          <span class="chart__label">${point.label}</span>
        </div>
      `,
    )
    .join('');
}

function renderAlertsTable(container, alerts = []) {
  if (!container) {
    return;
  }
  if (!alerts.length) {
    container.innerHTML = '<tr><td colspan="4">Aucune alerte récente.</td></tr>';
    return;
  }
  container.innerHTML = alerts
    .map(
      (alert) => `
        <tr>
          <td><span class="badge ${alert.priority === 'Haute' ? 'badge--danger' : 'badge--warning'}">${alert.priority}</span></td>
          <td>${alert.vehicleId || '—'}</td>
          <td>${formatDateLabel(alert.date)}</td>
          <td>${alert.status}</td>
        </tr>
      `,
    )
    .join('');
}

function renderMissionsTable(container, missions = []) {
  if (!container) {
    return;
  }
  if (!missions.length) {
    container.innerHTML = '<tr><td colspan="4">Aucune mission récente.</td></tr>';
    return;
  }
  container.innerHTML = missions
    .map(
      (mission) => `
        <tr>
          <td>${mission.driverName || mission.driverId || '—'}</td>
          <td>${mission.departure} → ${mission.arrival}</td>
          <td><span class="badge ${mission.status === 'En cours' ? 'badge--success' : 'badge--neutral'}">${mission.status}</span></td>
          <td>${mission.nextStop || '—'}</td>
        </tr>
      `,
    )
    .join('');
}

function renderDriverMission(container, mission) {
  if (!container) {
    return;
  }
  if (!mission) {
    container.innerHTML = '<p>Pas de mission planifiée pour le moment.</p>';
    return;
  }
  container.innerHTML = `
    <div>
      <p class="eyebrow">${mission.status}</p>
      <h4>${mission.departure} → ${mission.arrival}</h4>
      <ul class="mission-details">
        <li><span>Départ :</span> ${formatDateLabel(mission.startDate)}</li>
        <li><span>Cargo :</span> ${mission.cargo}</li>
        <li><span>Prochain arrêt :</span> ${mission.nextStop}</li>
      </ul>
    </div>
  `;
}

function renderDriverHistory(container, items = []) {
  if (!container) {
    return;
  }
  if (!items.length) {
    container.innerHTML = '<p>Aucun événement récent.</p>';
    return;
  }
  container.innerHTML = items
    .map(
      (item) => `
        <article class="history-item">
          <div>
            <p class="history-label">${item.type}</p>
            <h4>${item.summary}</h4>
            <p class="field-note">${formatDateLabel(item.date)}</p>
          </div>
          <span class="badge ${item.status === 'Ouvert' || item.status === 'Ouverte' ? 'badge--warning' : 'badge--success'}">${item.status}</span>
        </article>
      `,
    )
    .join('');
}

function renderAdminCriticalAlerts(container, alerts = [], carriers = []) {
  if (!container) {
    return;
  }
  if (!alerts.length) {
    container.innerHTML = '<tr><td colspan="4">Aucune alerte critique.</td></tr>';
    return;
  }
  const registry = carriers.length ? carriers : demoCarriers;
  container.innerHTML = alerts
    .map((alert) => {
      const carrier = registry.find((item) => item.id === alert.carrierId);
      const carrierLabel = alert.carrierName || carrier?.alias || carrier?.name || '—';
      return `
        <tr>
          <td><span class="badge badge--danger">${alert.priority}</span></td>
          <td>${alert.vehicleId || '—'}</td>
          <td>${carrierLabel}</td>
          <td>${formatDateLabel(alert.date)}</td>
        </tr>
      `;
    })
    .join('');
}

function updateRecentAccounts(users = []) {
  if (!adminRecentAccountsBody) {
    return;
  }
  if (!users.length) {
    adminRecentAccountsBody.innerHTML = '<tr><td colspan="4">Aucun compte disponible.</td></tr>';
    return;
  }
  const latest = [...users]
    .sort((a, b) => (b.id ?? 0) - (a.id ?? 0))
    .slice(0, 5);
  adminRecentAccountsBody.innerHTML = latest
    .map(
      (user) => `
        <tr>
          <td>${user.id ?? '—'}</td>
          <td>${user.username ?? '—'}</td>
          <td>${user.email}</td>
          <td>${(user.roles ?? []).join(', ') || '—'}</td>
        </tr>
      `,
    )
    .join('');
}

function renderCarrierDashboard(data) {
  if (!data) {
    return;
  }
  toggleSection(carrierSection, true);
  if (carrierSummary) {
    carrierSummary.textContent = `${data.carrier.alias} · ${data.carrier.region}`;
  }
  renderKpiGrid(carrierKpis, data.kpis);
  renderChart(carrierAlertsChart, data.alertsByWeek);
  renderChart(carrierIncidentsChart, data.incidentBreakdown);
  renderAlertsTable(carrierAlertsTable, data.recentAlerts);
  renderMissionsTable(carrierMissionsTable, data.recentMissions);
}

function renderDriverDashboard(data) {
  if (!data) {
    return;
  }
  toggleSection(driverSection, true);
  if (driverSummary) {
    driverSummary.textContent = `${data.driver.name} · ${data.carrier.alias}`;
  }
  renderKpiGrid(driverKpis, data.kpis);
  renderDriverMission(driverNextMission, data.nextMission);
  renderDriverHistory(driverHistoryList, data.history);
}

function bindQuickActions() {
  if (!quickActionButtons || !quickActionButtons.length) {
    return;
  }
  const messages = {
    'add-vehicle': 'Nouveau véhicule ajouté à la liste (simulation).',
    'add-driver': 'Invitation conducteur envoyée (simulation).',
    'plan-maintenance': 'Créneau maintenance proposé (simulation).',
    'share-report': 'Rapport exporté et prêt à être partagé (simulation).',
  };
  quickActionButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.dataset.action;
      const message = messages[action] || 'Action enregistrée (TODO backend).';
      if (carrierActionsStatus) {
        carrierActionsStatus.textContent = message;
      }
    });
  });
}

function bindDriverIncidentForm() {
  if (!driverIncidentForm) {
    return;
  }
  driverIncidentForm.addEventListener('submit', (event) => {
    event.preventDefault();
    if (driverIncidentStatus) {
      driverIncidentStatus.textContent = 'Incident transmis à votre exploitant. (Simulation en attente du backend)';
    }
    driverIncidentForm.reset();
  });
}

function applyAdminInsights() {
  if (!isAdmin || !isAdminPage) {
    return;
  }
  const overview = getAdminOverviewData();
  if (adminTotalCarriers) {
    adminTotalCarriers.textContent = overview.totals.carriers;
  }
  if (adminTotalDrivers) {
    adminTotalDrivers.textContent = overview.totals.drivers;
  }
  if (adminTotalVehicles) {
    adminTotalVehicles.textContent = overview.totals.vehicles;
  }
  if (adminTotalAlerts) {
    adminTotalAlerts.textContent = overview.totals.openAlerts;
  }
  if (adminTodayIncidents) {
    adminTodayIncidents.textContent = overview.totals.incidentsToday;
  }
  if (adminResolutionRate) {
    adminResolutionRate.textContent = overview.totals.resolutionRate;
  }
  renderChart(adminAlertsChart, overview.alertTrend);
  renderChart(adminIncidentsChart, overview.incidentBreakdown);
  renderChart(
    adminActivityChart,
    overview.fleetActivity.map((item) => ({ label: item.carrier, value: item.alerts })),
  );
  renderAdminCriticalAlerts(adminCriticalAlertsTable, overview.criticalAlerts, overview.carriers || []);
}

function applyRoleVisibility() {
  if (!roleAwareSections.length) {
    return;
  }

  roleAwareSections.forEach((section) => {
    const rawRoles = section.getAttribute('data-visible-for');
    if (!rawRoles) {
      section.hidden = false;
      section.removeAttribute('aria-hidden');
      return;
    }
    const allowedRoles = rawRoles
      .split(',')
      .map((role) => role.trim())
      .filter(Boolean);

    if (!allowedRoles.length) {
      section.hidden = false;
      section.removeAttribute('aria-hidden');
      return;
    }

    const requiresStrictAdmin = allowedRoles.length === 1 && allowedRoles[0] === ADMIN_ROLE;
    if (!isAdmin && requiresStrictAdmin) {
      section.hidden = true;
      section.setAttribute('aria-hidden', 'true');
      return;
    }

    const shouldDisplay = allowedRoles.some((role) => roles.includes(role));
    section.hidden = !shouldDisplay;
    section.setAttribute('aria-hidden', String(!shouldDisplay));
  });
}

logoutBtn?.addEventListener('click', () => {
  resetRoleCookie();
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

applyRoleVisibility();

toggleSection(carrierSection, shouldShowCarrierView);
toggleSection(driverSection, shouldShowDriverView);

if (shouldShowCarrierView) {
  const carrierData = getCarrierDashboardData(signedInEmail);
  renderCarrierDashboard(carrierData);
  bindQuickActions();
}

if (shouldShowDriverView) {
  const driverData = getDriverDashboardData(signedInEmail);
  renderDriverDashboard(driverData);
  bindDriverIncidentForm();
}

if (!shouldShowCarrierView && !shouldShowDriverView && !isAdminPage && guardBanner && !guardMessage) {
  guardBanner.textContent = 'Ce tableau est réservé aux exploitants et aux conducteurs.';
  guardBanner.hidden = false;
}

applyAdminInsights();

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
    updateRecentAccounts(users);
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
  console.info('Token décodé (debug):', decodedToken);
}
