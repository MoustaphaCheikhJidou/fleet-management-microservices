import { API_BASE_URL, ENDPOINTS } from './config.js';
import { getToken } from './session.js';

const INVITE_ENDPOINT = '/v1/admin/users/invite';

function emptyTables() {
  return { carriers: [], drivers: [], alerts: [] };
}

function baseDays() {
  return ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((dayLabel, idx) => ({
    dayLabel,
    total: 0,
    critical: 0,
    dayIndex: idx,
  }));
}

function baseIncidents() {
  return [
    { type: 'Sécurité', count: 0 },
    { type: 'Maintenance', count: 0 },
    { type: 'Qualité', count: 0 },
    { type: 'Réglementaire', count: 0 },
    { type: 'Opérations', count: 0 },
  ];
}

function normalizeAdmins(list = []) {
  return (Array.isArray(list) ? list : []).map((item, idx) => ({
    id: item.id ?? idx + 1,
    email: item.email ?? 'admin@noreply.local',
    profiles: item.profiles ?? item.roles ?? ['Administrateur'],
    enabled: item.enabled ?? true,
    status: statusLabelFromBackend(item.status),
  }));
}

function statusLabelFromBackend(raw) {
  if (!raw) return 'Actif';
  if (raw === 'PENDING_ACTIVATION' || raw === 'INVITED') return 'En attente';
  if (raw === 'DISABLED') return 'Désactivé';
  return raw;
}

function normalizeUsers(list = []) {
  return (Array.isArray(list) ? list : []).map((item, idx) => ({
    id: item.id ?? idx + 11,
    username: item.username ?? item.email ?? `user-${idx + 1}`,
    email: item.email ?? 'utilisateur@noreply.local',
    profiles: item.profiles ?? item.roles ?? ['Utilisateur'],
    enabled: item.enabled ?? true,
    status: statusLabelFromBackend(item.status),
  }));
}

function normalizeCarriers(list = []) {
  return (Array.isArray(list) ? list : []).map((item, idx) => ({
    id: item.id ?? idx + 101,
    name: item.name ?? item.fullName ?? item.carrierName ?? item.label ?? 'Exploitant',
    city: item.city ?? item.location ?? '—',
    fleetSize: Math.max(0, Number(item.fleetSize ?? item.vehicles ?? item.size ?? 0)),
    contactEmail: item.contactEmail ?? item.email ?? '',
    openAlerts: Number(item.openAlerts ?? item.alerts ?? 0),
    enabled: item.enabled ?? true,
    status: statusLabelFromBackend(item.status ?? item.accountStatus),
  }));
}

function normalizeDrivers(list = []) {
  return (Array.isArray(list) ? list : []).map((item, idx) => ({
    id: item.id ?? idx + 201,
    name: item.name ?? item.fullName ?? `${item.firstName || 'Conducteur'} ${item.lastName || ''}`.trim(),
    carrier: item.carrier ?? item.company ?? item.fleet ?? 'Exploitant',
    email: item.email ?? 'contact@noreply.local',
    phone: item.phone ?? item.tel ?? '',
    vehicle: item.vehicle ?? item.vehicleId ?? '',
    lastActivity: item.lastActivity ?? item.lastSeen ?? 'À planifier',
    enabled: item.enabled ?? true,
    status: statusLabelFromBackend(item.status ?? item.accountStatus),
  }));
}

function normalizeAlerts(list = []) {
  return (Array.isArray(list) ? list : []).map((item, idx) => ({
    id: item.id ?? idx + 301,
    type: item.type ?? item.category ?? 'Incident',
    severity: item.severity ?? item.level ?? 'Moyenne',
    vehicle: item.vehicle ?? item.asset ?? '—',
    driver: item.driver ?? item.operator ?? '—',
    carrier: item.carrier ?? item.company ?? '—',
    date: item.date ?? item.createdAt ?? 'Jour',
    status: item.status ?? item.state ?? 'Ouverte',
    assignee: item.assignee ?? item.owner ?? '—',
  }));
}

function incidentsByTypeFromAlerts(alerts = [], fallback = baseIncidents()) {
  if (!alerts.length) return fallback;
  const counts = {};
  alerts.forEach((a) => {
    const key = a.type || 'Incident';
    counts[key] = (counts[key] || 0) + (a.severity === 'Critique' ? 2 : 1);
  });
  const computed = Object.entries(counts)
    .map(([type, count]) => ({ type, count }))
    .slice(0, 6);
  return computed.length ? computed : fallback;
}

function alertsByDayFromAlerts(alerts = [], fallback = baseDays()) {
  if (!alerts.length) return fallback;
  const daysOrder = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  const map = new Map();
  daysOrder.forEach((day) => map.set(day, { dayLabel: day, total: 0, critical: 0 }));
  alerts.forEach((a) => {
    const day = daysOrder.find((d) => (a.date || '').includes(d)) || 'Lun';
    const entry = map.get(day);
    entry.total += 1;
    if (a.severity === 'Critique') entry.critical += 1;
  });
  return Array.from(map.values()).map((row, idx) => ({ ...row, dayIndex: idx }));
}

function deriveEntitiesFromUsers(users = []) {
  const carriers = [];
  const drivers = [];
  users.forEach((user, idx) => {
    const roles = Array.isArray(user.roles) ? user.roles : [];
    const base = {
      id: user.id ?? idx + 1000,
      name: user.fullName || user.username || user.email,
      email: user.email,
      contactEmail: user.email,
      city: user.city || '—',
      company: user.company,
      fleetSize: user.fleetSize || 0,
      phone: user.phone,
      vehicle: user.vehicle,
      status: statusLabelFromBackend(user.status),
      accountStatus: user.status,
    };
    if (roles.includes('ROLE_CARRIER')) {
      carriers.push({ ...base, fleetSize: user.fleetSize || 0, openAlerts: 0 });
    }
    if (roles.includes('ROLE_DRIVER')) {
      drivers.push({ ...base, carrier: user.company || base.company || 'Exploitant' });
    }
  });
  return { carriers, drivers };
}

function mapBackendToTables({ carriers, drivers, alerts, users }) {
  const derived = deriveEntitiesFromUsers(users);
  return {
    carriers: normalizeCarriers(carriers || derived.carriers),
    drivers: normalizeDrivers(drivers || derived.drivers),
    alerts: normalizeAlerts(alerts),
  };
}

function buildSeriesFromTables(tables) {
  const alerts = tables.alerts || [];
  const alertsByDay = alertsByDayFromAlerts(alerts, baseDays());
  const incidentsByType = incidentsByTypeFromAlerts(alerts, baseIncidents());
  return {
    alertsByDay,
    dailyAlerts: alertsByDay,
    incidentsByType,
    typologies: incidentsByType,
  };
}

function buildSnapshotFromTables(tables, { admins = [], users = [], source, statusLabel }) {
  const kpis = {
    totalCarriers: tables.carriers?.length || 0,
    totalDrivers: tables.drivers?.length || 0,
    totalAdmins: admins?.length || 0,
    totalUsers: users?.length || 0,
    totalVehicles: 0,
    openAlerts: tables.alerts?.length || 0,
    criticalAlerts: (tables.alerts || []).filter((a) => a.severity === 'Critique').length,
    incidentsToday: 0,
    activeMissions: 0,
    activityRatePct: 0,
  };
  const series = buildSeriesFromTables(tables);
  return {
    snapshot: {
      kpis,
      series,
      tables,
      admins: normalizeAdmins(admins),
      users: normalizeUsers(users),
    },
    source,
    statusLabel,
  };
}

function buildEmptySnapshot() {
  return buildSnapshotFromTables(emptyTables(), {
    admins: [],
    source: 'vide',
    statusLabel: 'Aucune donnée opérationnelle. Commencez par inviter un exploitant, puis un conducteur.',
  });
}

async function quietFetch(path) {
  const url = `${API_BASE_URL}${path}`;
  const headers = new Headers();
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  try {
    const response = await fetch(url, { headers });
    if (response.status === 401 || response.status === 403) return null;
    if (!response.ok) return null;
    const text = await response.text();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch (error) {
      return null;
    }
  } catch (error) {
    return null;
  }
}

export async function getAdminDataset({ preferLive = true } = {}) {
  const token = getToken();
  if (!token || !preferLive) {
    return buildEmptySnapshot();
  }

  try {
    const [admins, users, drivers, carriers, alerts] = await Promise.all([
      quietFetch(ENDPOINTS.adminAdmins),
      quietFetch(ENDPOINTS.adminUsers),
      quietFetch('/v1/admin/users/drivers'),
      quietFetch('/v1/admin/users/carriers'),
      quietFetch('/v1/issues/alerts'),
    ]);

    const tables = mapBackendToTables({ carriers: carriers || [], drivers: drivers || [], alerts: alerts || [], users: users || [] });
    return buildSnapshotFromTables(tables, {
      admins: normalizeAdmins(admins || []),
      users: normalizeUsers(users || []),
      source: 'live',
      statusLabel: 'Données en direct chargées.',
    });
  } catch (error) {
    return buildEmptySnapshot();
  }
}

export function recomputeSnapshotWithAlerts(snapshot, alerts) {
  if (!snapshot) return snapshot;
  const tables = { ...(snapshot.tables || emptyTables()), alerts: alerts || [] };
  return buildSnapshotFromTables(tables, {
    admins: snapshot.admins || [],
    users: snapshot.users || [],
    source: 'local',
    statusLabel: 'Alertes mises à jour.',
  }).snapshot;
}

async function postInvite(body) {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const res = await fetch(`${API_BASE_URL}${INVITE_ENDPOINT}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let payload = null;
    try {
      payload = await res.text();
    } catch (_) {
      payload = null;
    }
    console.debug('[adminDataService] invite failed', res.status, payload);
    const error = new Error('INVITE_FAILED');
    error.status = res.status;
    error.payload = payload;
    throw error;
  }
  return { status: res.status };
}

export async function inviteCarrier({ email, fullName, city, fleetSize }) {
  return postInvite({
    email,
    fullName,
    role: 'CARRIER',
    metadata: {
      company: fullName || email,
      city,
      fleetSize: Number(fleetSize) || 0,
    },
  });
}

export async function inviteDriver({ email, fullName, carrierId, phone }) {
  return postInvite({
    email,
    fullName,
    role: 'DRIVER',
    metadata: {
      phone,
      company: carrierId ? String(carrierId) : undefined,
    },
  });
}

export async function inviteAdmin({ email, fullName }) {
  return postInvite({ email, fullName, role: 'ADMIN' });
}

export { buildEmptySnapshot };
