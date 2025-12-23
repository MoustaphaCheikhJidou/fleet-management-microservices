function mulberry32(seed) {
  let t = seed;
  return () => {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(list, rnd) {
  return list[Math.floor(rnd() * list.length)];
}

function timeAgo(minutes) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.round(minutes / 60);
  return `${hours} h`;
}

function buildKpis({ vehicles, drivers, alerts, missions }) {
  const openAlerts = alerts.filter((a) => a.status !== 'Clôturée').length;
  const activeDrivers = drivers.filter((d) => d.status === 'En service').length;
  const inProgress = missions.filter((m) => m.status === 'En cours').length;
  return {
    vehiclesActive: vehicles.filter((v) => v.status === 'En ligne').length,
    driversActive: activeDrivers,
    openAlerts,
    missionsInProgress: inProgress,
  };
}

function buildVehicles(rnd) {
  const names = ['Tracteur T480', 'Camion C430', 'Fourgon Master', 'Tracteur G520', 'Van Daily'];
  const statuses = ['En ligne', 'En maintenance', 'Disponible'];
  const cities = ['Lyon', 'Paris', 'Lille', 'Toulouse', 'Bordeaux'];
  return Array.from({ length: 12 }).map((_, idx) => ({
    id: idx + 1,
    name: pick(names, rnd),
    city: pick(cities, rnd),
    status: pick(statuses, rnd),
    mileage: 250000 + Math.floor(rnd() * 40000),
  }));
}

function buildDrivers(rnd) {
  const names = ['Lina Dupont', 'Yanis Leroy', 'Nora Gauthier', 'Omar Lemaire', 'Rita Morel', 'Alex Tissier'];
  const statuses = ['En service', 'En pause', 'Hors service'];
  return names.map((name, idx) => ({
    id: idx + 1,
    name,
    shift: rnd() > 0.5 ? 'Matin' : 'Soir',
    status: pick(statuses, rnd),
    lastEvent: timeAgo(Math.floor(rnd() * 180)),
  }));
}

function buildAlerts(rnd) {
  const priorities = ['Critique', 'Élevée', 'Moyenne'];
  const statuses = ['Ouverte', 'En cours', 'Clôturée'];
  const vehicles = ['T480-21', 'C430-09', 'Master-55', 'G520-14'];
  const types = ['Température', 'Pression pneus', 'Vitesse', 'Maintenance'];
  return Array.from({ length: 10 }).map((_, idx) => ({
    id: idx + 1,
    priority: pick(priorities, rnd),
    vehicle: pick(vehicles, rnd),
    type: pick(types, rnd),
    date: 'Aujourd’hui',
    status: pick(statuses, rnd),
  }));
}

function buildMissions(rnd) {
  const routes = ['Paris → Lille', 'Lyon → Grenoble', 'Toulouse → Bordeaux', 'Nantes → Rennes'];
  const statuses = ['En cours', 'Planifiée', 'En attente'];
  const stops = ['Aire de Ressons', 'Entrepôt Lyon Sud', 'Hub Ouest', 'Base Nord'];
  const drivers = ['Lina Dupont', 'Yanis Leroy', 'Omar Lemaire', 'Nora Gauthier'];
  return Array.from({ length: 8 }).map((_, idx) => ({
    id: idx + 1,
    driver: pick(drivers, rnd),
    route: pick(routes, rnd),
    status: pick(statuses, rnd),
    nextStop: pick(stops, rnd),
    etaMinutes: 20 + Math.floor(rnd() * 120),
  }));
}

function buildInvoices(rnd) {
  const clients = ['Atlas Logistique', 'Nord Fret', 'Med Cargo', 'Cap Transit'];
  const statuses = ['Payée', 'Émise', 'En retard'];
  return Array.from({ length: 6 }).map((_, idx) => ({
    id: idx + 1,
    reference: `INV-${4100 + idx}`,
    client: pick(clients, rnd),
    amount: 3200 + Math.floor(rnd() * 1800),
    status: pick(statuses, rnd),
    dueDate: 'M+1',
  }));
}

function buildSeries(alerts, missions) {
  const alertCount = alerts.reduce(
    (acc, alert) => {
      acc[alert.priority] = (acc[alert.priority] || 0) + 1;
      return acc;
    },
    { Critique: 0, Élevée: 0, Moyenne: 0 }
  );

  const missionsByStatus = missions.reduce(
    (acc, mission) => {
      acc[mission.status] = (acc[mission.status] || 0) + 1;
      return acc;
    },
    { 'En cours': 0, Planifiée: 0, 'En attente': 0 }
  );

  return {
    alertBreakdown: Object.entries(alertCount).map(([label, value]) => ({ label, value })),
    missionBreakdown: Object.entries(missionsByStatus).map(([label, value]) => ({ label, value })),
  };
}

export function generateOperatorMockData(seed = Date.now()) {
  const rnd = mulberry32(seed >>> 0);
  const vehicles = buildVehicles(rnd);
  const drivers = buildDrivers(rnd);
  const alerts = buildAlerts(rnd);
  const missions = buildMissions(rnd);
  const invoices = buildInvoices(rnd);
  const kpis = buildKpis({ vehicles, drivers, alerts, missions });
  const series = buildSeries(alerts, missions);

  return {
    seed,
    kpis,
    series,
    tables: {
      alerts,
      vehicles,
      drivers,
      missions,
      invoices,
    },
  };
}
