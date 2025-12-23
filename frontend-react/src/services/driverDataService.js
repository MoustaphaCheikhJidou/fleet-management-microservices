import { API_BASE_URL } from './config.js';
import { getToken } from './session.js';
import { generateDriverMockData } from '../mock/driverMockData.js';

const SEED_KEY = 'driver_demo_seed';

const isMockForced = () => {
  try {
    return window.sessionStorage.getItem('forceMock') === 'true';
  } catch (error) {
    return false;
  }
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function getSeed() {
  const stored = Number(window.localStorage.getItem(SEED_KEY));
  if (Number.isFinite(stored) && stored > 0) return stored;
  const seed = Date.now();
  window.localStorage.setItem(SEED_KEY, `${seed}`);
  return seed;
}

function refreshSeed() {
  const seed = Date.now();
  window.localStorage.setItem(SEED_KEY, `${seed}`);
  return seed;
}

const allowLiveRequests = () => Boolean(getToken());

async function quietGet(path) {
  if (!allowLiveRequests()) return null;
  const token = getToken();
  const headers = new Headers({ Accept: 'application/json' });
  if (token) headers.set('Authorization', `Bearer ${token}`);
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, { headers });
    if (!response.ok) return null;
    const text = await response.text();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch (error) {
      console.debug('[DRIVER_DATA] réponse non JSON ignorée', error?.message);
      return null;
    }
  } catch (error) {
    console.debug('[DRIVER_DATA] échec requête silencieuse', error?.message);
    return null;
  }
}

function normalizeTable(list = [], mapper) {
  return Array.isArray(list) && list.length ? list.map(mapper) : [];
}

function mapBackendToSnapshot({ overview, missions, alerts, payments, seedBase }) {
  const base = generateDriverMockData(seedBase ?? Date.now());
  const tables = {
    missions: normalizeTable(missions, (m, idx) => ({
      id: m.id ?? idx + 1,
      route: m.route ?? m.title ?? 'Trajet',
      status: m.status ?? 'Planifiée',
      startTime: m.startTime ?? m.departure ?? '08:00',
      day: m.day ?? m.dateLabel ?? 'Aujourd’hui',
      nextStop: m.nextStop ?? m.stop ?? 'Arrêt prévu',
    })) || base.tables.missions,
    alerts: normalizeTable(alerts, (a, idx) => ({
      id: a.id ?? idx + 1,
      type: a.type ?? a.category ?? 'Alerte',
      severity: a.severity ?? a.level ?? 'Moyenne',
      status: a.status ?? 'Suivie',
      timeAgo: a.timeAgo ?? a.delay ?? 'Récemment',
    })) || base.tables.alerts,
    payments: normalizeTable(payments, (p, idx) => ({
      id: p.id ?? idx + 1,
      reference: p.reference ?? p.label ?? `PAY-${idx + 1}`,
      amount: Number.isFinite(p.amount) ? p.amount : p.total ?? p.value ?? 0,
      status: p.status ?? p.state ?? 'À venir',
      method: p.method ?? p.channel ?? 'Virement',
      date: p.date ?? p.paidAt ?? p.dueDate ?? 'Aujourd’hui',
      mission: p.mission ?? p.route ?? 'Mission',
    })) || base.tables.payments,
  };

  if (!tables.missions.length) tables.missions = base.tables.missions;
  if (!tables.alerts.length) tables.alerts = base.tables.alerts;
  if (!tables.payments.length) tables.payments = base.tables.payments;

  const kpis = overview?.kpis
    ? overview.kpis
    : {
        missionsToday: tables.missions.filter((m) => m.day === 'Aujourd’hui').length || tables.missions.length,
        unreadAlerts: tables.alerts.filter((a) => a.status === 'À traiter').length,
        kmWeek: overview?.kmWeek ?? base.kpis.kmWeek,
        dutyStatus: overview?.dutyStatus ?? base.kpis.dutyStatus,
      };

  return { kpis, tables };
}

function buildResponse({ snapshot, source, statusLabel }) {
  return { snapshot, source, statusLabel };
}

function anyNonEmpty(list) {
  return Array.isArray(list) && list.length > 0;
}

export async function getDriverSnapshot({ preferLive = true, freshSeed = false } = {}) {
  const fallback = () => {
    const seed = freshSeed ? refreshSeed() : getSeed();
    const mock = generateDriverMockData(seed);
    return buildResponse({ snapshot: clone(mock), source: 'mock', statusLabel: 'Sources indisponibles, affichage de démonstration.' });
  };

  const useLive = preferLive && allowLiveRequests() && !isMockForced();

  if (useLive) {
    try {
      const [overviewRes, missionsRes, alertsRes, paymentsRes] = await Promise.allSettled([
        quietGet('/v1/driver/overview'),
        quietGet('/v1/driver/missions'),
        quietGet('/v1/driver/alerts'),
        quietGet('/v1/driver/payments'),
      ]);

      const overview = overviewRes.status === 'fulfilled' ? overviewRes.value : null;
      const missions = missionsRes.status === 'fulfilled' ? missionsRes.value : null;
      const alerts = alertsRes.status === 'fulfilled' ? alertsRes.value : null;
      const payments = paymentsRes.status === 'fulfilled' ? paymentsRes.value : null;

      const atLeastOne = [missions, alerts, payments].some((v) => Array.isArray(v) && v.length);
      if (atLeastOne || overview) {
        const snapshot = mapBackendToSnapshot({ overview, missions, alerts, payments, seedBase: Date.now() });
        const partial = !(overview && anyNonEmpty(missions) && anyNonEmpty(alerts) && anyNonEmpty(payments));
        const statusLabel = partial
          ? 'Sources temps réel partielles, complétées par une simulation.'
          : 'Sources temps réel chargées.';
        return buildResponse({ snapshot, source: 'live', statusLabel });
      }
    } catch (error) {
      console.debug('[DRIVER_DATA] live indisponible, fallback simulation', error?.message);
    }
  }

  if (preferLive && !allowLiveRequests()) {
    return buildResponse({
      snapshot: fallback().snapshot,
      source: 'mock',
      statusLabel: 'Connexion requise pour les données temps réel. Mode démo affiché.',
    });
  }

  return fallback();
}
