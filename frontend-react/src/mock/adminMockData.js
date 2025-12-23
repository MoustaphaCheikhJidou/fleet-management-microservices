// Générateur de données mock pour le cockpit admin (100% côté front, sans dépendance backend).

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

function daysAgoLabel(days) {
  if (days === 0) return "Aujourd’hui";
  if (days === 1) return 'Hier';
  return `Il y a ${days} jours`;
}

function timeAgo(minutes) {
  if (minutes < 60) return `Il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  return `Il y a ${hours} h`;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function buildCarriers(rnd) {
  return [
    { id: 1, name: 'Atlas Parc', city: 'Lyon', fleetSize: 42, openAlerts: 3, status: 'Actif' },
    { id: 2, name: 'Nordic Transport', city: 'Lille', fleetSize: 47, openAlerts: 2, status: 'Actif' },
    { id: 3, name: 'SudExpress Logistique', city: 'Toulouse', fleetSize: 31, openAlerts: 5, status: 'Suspendu' },
    { id: 4, name: 'Ouest Mobilité', city: 'Nantes', fleetSize: 28, openAlerts: 1, status: 'Actif' },
    { id: 5, name: 'CapAzur Fleet', city: 'Nice', fleetSize: 24, openAlerts: 0, status: 'Actif' },
  ].map((item, idx) => ({ ...item, id: idx + 1 + Math.floor(rnd() * 10) }));
}

function buildDrivers(rnd, carriers) {
  const sample = [
    { name: 'Lina Dupont', vehicle: 'T480-21', carrier: carriers[0].name },
    { name: 'Yanis Leroy', vehicle: 'C430-09', carrier: carriers[1].name },
    { name: 'Nora Gauthier', vehicle: 'Master-55', carrier: carriers[1].name },
    { name: 'Omar Lemaire', vehicle: 'G520-14', carrier: carriers[2].name },
    { name: 'Rita Morel', vehicle: 'Daily-33', carrier: carriers[3].name },
    { name: 'Alex Tissier', vehicle: 'T480-07', carrier: carriers[4].name },
  ];
  return sample.map((d, idx) => ({
    id: idx + 1,
    name: d.name,
    carrier: d.carrier,
    vehicle: d.vehicle,
    lastActivity: timeAgo(15 + Math.floor(rnd() * 320)),
    status: rnd() > 0.18 ? 'Actif' : 'Inactif',
  }));
}

function buildAlerts(rnd, carriers, drivers) {
  const severities = ['Faible', 'Moyenne', 'Élevée', 'Critique'];
  const statuses = ['Ouverte', 'En cours', 'Résolue'];
  const types = ['Température', 'Pression pneus', 'Freinage', 'Vitesse', 'Maintenance'];
  const vehicles = ['Camion T480', 'Fourgon Master', 'Camion C430', 'Tracteur G520', 'Van Daily'];
  const alerts = [];
  for (let i = 0; i < 18; i++) {
    const carrier = pick(carriers, rnd);
    const driver = pick(drivers, rnd);
    alerts.push({
      id: i + 1,
      type: pick(types, rnd),
      severity: pick(severities, rnd),
      vehicle: pick(vehicles, rnd),
      driver: driver.name,
      carrier: carrier.name,
      date: daysAgoLabel(Math.floor(rnd() * 4)),
      status: pick(statuses, rnd),
    });
  }
  return alerts;
}

function buildAlertsByDay(rnd, alerts) {
  const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  return days.map((day, idx) => {
    const total = 8 + Math.floor(rnd() * 8);
    const critical = Math.min(total, 2 + Math.floor(rnd() * 4));
    return { dayLabel: day, total, critical, dayIndex: idx };
  }).map((row, idx) => ({ ...row, total: row.total + (alerts[idx % alerts.length]?.severity === 'Critique' ? 1 : 0) }));
}

function buildIncidentsByType(alerts) {
  const counts = {};
  alerts.forEach((a) => {
    counts[a.type] = (counts[a.type] || 0) + (a.severity === 'Critique' ? 2 : 1);
  });
  return Object.entries(counts).map(([type, count]) => ({ type, count })).slice(0, 6);
}

export function computeKpisFromData(data) {
  const { carriers = [], drivers = [], alerts = [] } = data;
  const closedStatuses = ['Résolue', 'Résolu', 'Traitée', 'Traitee'];
  const openAlerts = alerts.filter((a) => !closedStatuses.includes(`${a.status || ''}`)).length;
  const criticalAlerts = alerts.filter((a) => a.severity === 'Critique').length;
  const incidentsToday = alerts.filter((a) => a.date === "Aujourd’hui").length;
  const activeDrivers = drivers.filter((d) => d.status === 'Actif').length;
  const activityRatePct = drivers.length ? Math.round((activeDrivers / drivers.length) * 100) : 0;
  const activeMissions = alerts.length;
  const totalVehicles = carriers.reduce((sum, c) => sum + (Number(c.fleetSize) || 0), 0);

  return {
    totalCarriers: carriers.length,
    totalDrivers: drivers.length,
    totalVehicles,
    openAlerts,
    criticalAlerts,
    incidentsToday,
    activeMissions,
    activityRatePct,
  };
}

export function generateAdminMockData(seed = Date.now()) {
  const rnd = mulberry32(seed >>> 0);
  const carriers = buildCarriers(rnd);
  const drivers = buildDrivers(rnd, carriers);
  const alerts = buildAlerts(rnd, carriers, drivers);
  const alertsByDay = buildAlertsByDay(rnd, alerts);
  const incidentsByType = buildIncidentsByType(alerts);

  const kpis = computeKpisFromData({ carriers, drivers, alerts });

  return {
    kpis,
    series: {
      alertsByDay,
      incidentsByType,
    },
    tables: {
      alerts,
      carriers,
      drivers,
    },
  };
}

export function addCarrier(data, carrierDraft) {
  const next = clone(data);
  const newCarrier = {
    id: Date.now(),
    name: (carrierDraft.name || '').trim(),
    city: (carrierDraft.city || '').trim(),
    fleetSize: Math.max(1, Number(carrierDraft.fleetSize) || 1),
    openAlerts: Number(carrierDraft.openAlerts) || 0,
    status: carrierDraft.status || 'Actif',
  };
  next.tables.carriers = [newCarrier, ...next.tables.carriers];
  next.kpis = computeKpisFromData({
    carriers: next.tables.carriers,
    drivers: next.tables.drivers,
    alerts: next.tables.alerts,
  });
  return next;
}

export function addDriver(data, driverDraft) {
  const next = clone(data);
  const newDriver = {
    id: Date.now(),
    name: (driverDraft.name || '').trim(),
    carrier: (driverDraft.carrier || '').trim(),
    vehicle: (driverDraft.vehicle || '').trim() || 'Véhicule assigné',
    lastActivity: timeAgo(5 + Math.floor(Math.random() * 180)),
    status: driverDraft.status || 'Actif',
  };
  next.tables.drivers = [newDriver, ...next.tables.drivers];
  next.kpis = computeKpisFromData({
    carriers: next.tables.carriers,
    drivers: next.tables.drivers,
    alerts: next.tables.alerts,
  });
  return next;
}
