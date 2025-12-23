import { API_BASE_URL } from './config.js';
import { getToken } from './session.js';
import { generateOperatorMockData } from '../mock/operatorMockData.js';

const SEED_KEY = 'operator_demo_seed';

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
      console.debug('[OPERATOR_DATA] réponse non JSON ignorée', error?.message);
      return null;
    }
  } catch (error) {
    console.debug('[OPERATOR_DATA] échec requête silencieuse', error?.message);
    return null;
  }
}

function normalizeKpis(raw, tables) {
  if (raw && typeof raw === 'object') return raw;
  const { vehicles = [], drivers = [], alerts = [], missions = [] } = tables || {};
  const openAlerts = alerts.filter((a) => a.status !== 'Clôturée').length;
  const vehiclesActive = vehicles.filter((v) => v.status === 'En ligne').length || vehicles.length;
  const driversActive = drivers.filter((d) => d.status === 'En service').length || drivers.length;
  const missionsInProgress = missions.filter((m) => m.status === 'En cours').length || missions.length;
  return { vehiclesActive, driversActive, openAlerts, missionsInProgress };
}

function normalizeTable(list = [], mapper) {
  return Array.isArray(list) && list.length ? list.map(mapper) : [];
}

function mapBackendToSnapshot({ overview, alerts, vehicles, drivers, missions, invoices, seedBase }) {
  const base = generateOperatorMockData(seedBase ?? Date.now());
  const tables = {
    alerts: normalizeTable(alerts, (a, idx) => ({
      id: a.id ?? idx + 1,
      priority: a.priority ?? a.severity ?? 'Moyenne',
      vehicle: a.vehicle ?? a.asset ?? 'Véhicule',
      type: a.type ?? a.category ?? 'Incident',
      date: a.date ?? 'Aujourd’hui',
      status: a.status ?? 'Ouverte',
    })) || base.tables.alerts,
    vehicles: normalizeTable(vehicles, (v, idx) => ({
      id: v.id ?? idx + 1,
      name: v.name ?? v.label ?? 'Véhicule',
      city: v.city ?? v.location ?? '—',
      status: v.status ?? 'En ligne',
      mileage: v.mileage ?? v.km ?? 0,
    })) || base.tables.vehicles,
    drivers: normalizeTable(drivers, (d, idx) => ({
      id: d.id ?? idx + 1,
      name: d.name ?? `${d.firstName || 'Conducteur'} ${d.lastName || ''}`.trim(),
      shift: d.shift ?? 'Matin',
      status: d.status ?? 'En service',
      lastEvent: d.lastEvent ?? d.lastSeen ?? 'Récemment',
    })) || base.tables.drivers,
    missions: normalizeTable(missions, (m, idx) => ({
      id: m.id ?? idx + 1,
      driver: m.driver ?? m.assignee ?? 'Conducteur',
      route: m.route ?? m.title ?? 'Trajet',
      status: m.status ?? 'En cours',
      nextStop: m.nextStop ?? m.hub ?? 'Prochain arrêt',
      etaMinutes: m.etaMinutes ?? m.eta ?? 30,
    })) || base.tables.missions,
    invoices: normalizeTable(invoices, (inv, idx) => ({
      id: inv.id ?? idx + 1,
      client: inv.client ?? inv.customer ?? 'Client',
      amount: Number.isFinite(inv.amount) ? inv.amount : inv.total ?? inv.value ?? 0,
      status: inv.status ?? inv.state ?? 'À émettre',
      dueDate: inv.dueDate ?? inv.date ?? 'À échéance',
      reference: inv.reference ?? inv.number ?? `INV-${idx + 1}`,
    })) || base.tables.invoices,
  };

  if (!tables.alerts.length) tables.alerts = base.tables.alerts;
  if (!tables.vehicles.length) tables.vehicles = base.tables.vehicles;
  if (!tables.drivers.length) tables.drivers = base.tables.drivers;
  if (!tables.missions.length) tables.missions = base.tables.missions;
  if (!tables.invoices.length) tables.invoices = base.tables.invoices;

  const kpis = normalizeKpis(overview?.kpis, tables);

  const series = base.series;
  return { kpis, series, tables };
}

function buildResponse({ snapshot, source, statusLabel }) {
  return { snapshot, source, statusLabel };
}

function anyNonEmpty(list) {
  return Array.isArray(list) && list.length > 0;
}

export async function getOperatorSnapshot({ preferLive = true, freshSeed = false } = {}) {
  const fallback = () => {
    const seed = freshSeed ? refreshSeed() : getSeed();
    const mock = generateOperatorMockData(seed);
    return buildResponse({ snapshot: clone(mock), source: 'mock', statusLabel: 'Sources indisponibles, affichage de démonstration.' });
  };

  const useLive = preferLive && allowLiveRequests() && !isMockForced();

  if (useLive) {
    try {
      const [overviewRes, alertsRes, vehiclesRes, driversRes, missionsRes, invoicesRes] = await Promise.allSettled([
        quietGet('/v1/operator/overview'),
        quietGet('/v1/operator/alerts'),
        quietGet('/v1/operator/vehicles'),
        quietGet('/v1/operator/drivers'),
        quietGet('/v1/operator/missions'),
        quietGet('/v1/operator/invoices'),
      ]);

      const overview = overviewRes.status === 'fulfilled' ? overviewRes.value : null;
      const alerts = alertsRes.status === 'fulfilled' ? alertsRes.value : null;
      const vehicles = vehiclesRes.status === 'fulfilled' ? vehiclesRes.value : null;
      const drivers = driversRes.status === 'fulfilled' ? driversRes.value : null;
      const missions = missionsRes.status === 'fulfilled' ? missionsRes.value : null;
      const invoices = invoicesRes.status === 'fulfilled' ? invoicesRes.value : null;

      const atLeastOne = [alerts, vehicles, drivers, missions, invoices].some((v) => Array.isArray(v) && v.length);
      if (atLeastOne || overview) {
        const snapshot = mapBackendToSnapshot({ overview, alerts, vehicles, drivers, missions, invoices, seedBase: Date.now() });
        const partial = !(
          overview && anyNonEmpty(alerts) && anyNonEmpty(vehicles) && anyNonEmpty(drivers) && anyNonEmpty(missions) && anyNonEmpty(invoices)
        );
        const statusLabel = partial
          ? 'Sources temps réel partielles, complétées par une simulation.'
          : 'Sources temps réel chargées.';
        return buildResponse({ snapshot, source: 'live', statusLabel });
      }
    } catch (error) {
      console.debug('[OPERATOR_DATA] live indisponible, fallback simulation', error?.message);
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
