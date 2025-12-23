const DAY_IN_MS = 86_400_000;
const now = Date.now();

function daysAgo(count) {
  const date = new Date(now - count * DAY_IN_MS);
  return date.toISOString();
}

function pad(number, size = 3) {
  return String(number).padStart(size, '0');
}

export const demoCarriers = [
  {
    id: 'car-001',
    name: 'Atlas Fleet Logistics',
    alias: 'Atlas Fleet',
    contact: 'operations@atlasfleet.com',
    region: 'Île-de-France',
    emailDomain: 'atlasfleet.com',
    status: 'Actif',
  },
  {
    id: 'car-002',
    name: 'Nordic Transport Services',
    alias: 'Nordic Transport',
    contact: 'planning@nordic-transport.fr',
    region: 'Hauts-de-France',
    emailDomain: 'nordic-transport.fr',
    status: 'Actif',
  },
  {
    id: 'car-003',
    name: 'SudExpress Mobility',
    alias: 'SudExpress',
    contact: 'contact@sudexpress.fr',
    region: 'Occitanie',
    emailDomain: 'sudexpress.fr',
    status: 'Actif',
  },
];

export const demoDrivers = [
  { id: 'drv-001', name: 'Lina Dupont', email: 'lina.dupont@atlasfleet.com', carrierId: 'car-001', status: 'En mission', primaryVehicleId: 'veh-001' },
  { id: 'drv-002', name: 'Yanis Leroy', email: 'yanis.leroy@atlasfleet.com', carrierId: 'car-001', status: 'Disponible', primaryVehicleId: 'veh-002' },
  { id: 'drv-003', name: 'Hugo Armand', email: 'hugo.armand@atlasfleet.com', carrierId: 'car-001', status: 'En repos', primaryVehicleId: 'veh-003' },
  { id: 'drv-004', name: 'Nora Gauthier', email: 'nora.gauthier@nordic-transport.fr', carrierId: 'car-002', status: 'En mission', primaryVehicleId: 'veh-008' },
  { id: 'drv-005', name: 'Omar Lemaire', email: 'omar.lemaire@nordic-transport.fr', carrierId: 'car-002', status: 'Disponible', primaryVehicleId: 'veh-009' },
  { id: 'drv-006', name: 'Sasha Fournier', email: 'sasha.fournier@nordic-transport.fr', carrierId: 'car-002', status: 'En repos', primaryVehicleId: 'veh-010' },
  { id: 'drv-007', name: 'Maël Carvalho', email: 'mael.carvalho@sudexpress.fr', carrierId: 'car-003', status: 'En mission', primaryVehicleId: 'veh-015' },
  { id: 'drv-008', name: 'Eva Roussel', email: 'eva.roussel@sudexpress.fr', carrierId: 'car-003', status: 'Disponible', primaryVehicleId: 'veh-017' },
];

export const demoVehicles = [
  { id: 'veh-001', carrierId: 'car-001', label: 'Tracteur T480', status: 'En mission', type: 'Poids lourd' },
  { id: 'veh-002', carrierId: 'car-001', label: 'Camion C430', status: 'Disponible', type: 'Poids lourd' },
  { id: 'veh-003', carrierId: 'car-001', label: 'Utilitaire Master', status: 'Maintenance', type: 'Utilitaire' },
  { id: 'veh-004', carrierId: 'car-001', label: 'Semi-remorque SR300', status: 'Disponible', type: 'Semi-remorque' },
  { id: 'veh-005', carrierId: 'car-001', label: 'Fourgon Daily', status: 'Disponible', type: 'Utilitaire' },
  { id: 'veh-006', carrierId: 'car-001', label: 'Camion frigorifique F260', status: 'En mission', type: 'Poids lourd' },
  { id: 'veh-007', carrierId: 'car-001', label: 'Fourgon City', status: 'Disponible', type: 'Utilitaire' },
  { id: 'veh-008', carrierId: 'car-002', label: 'Tracteur X560', status: 'En mission', type: 'Poids lourd' },
  { id: 'veh-009', carrierId: 'car-002', label: 'Camion plateau P360', status: 'Disponible', type: 'Poids lourd' },
  { id: 'veh-010', carrierId: 'car-002', label: 'Fourgon Cargo', status: 'Maintenance', type: 'Utilitaire' },
  { id: 'veh-011', carrierId: 'car-002', label: 'Camion citerne C410', status: 'Disponible', type: 'Poids lourd' },
  { id: 'veh-012', carrierId: 'car-002', label: 'Véhicule atelier V200', status: 'Disponible', type: 'Spécial' },
  { id: 'veh-013', carrierId: 'car-002', label: 'Semi-remorque SR200', status: 'En mission', type: 'Semi-remorque' },
  { id: 'veh-014', carrierId: 'car-003', label: 'Camion urbain U260', status: 'Disponible', type: 'Poids lourd' },
  { id: 'veh-015', carrierId: 'car-003', label: 'Fourgon rapide R150', status: 'En mission', type: 'Utilitaire' },
  { id: 'veh-016', carrierId: 'car-003', label: 'Pick-up logistique P110', status: 'Disponible', type: 'Pick-up' },
  { id: 'veh-017', carrierId: 'car-003', label: 'Camion citerne C320', status: 'Maintenance', type: 'Poids lourd' },
  { id: 'veh-018', carrierId: 'car-003', label: 'Camion frigo F330', status: 'En mission', type: 'Poids lourd' },
  { id: 'veh-019', carrierId: 'car-003', label: 'Fourgon CityLight', status: 'Disponible', type: 'Utilitaire' },
  { id: 'veh-020', carrierId: 'car-003', label: 'Semi-remorque SR150', status: 'Disponible', type: 'Semi-remorque' },
];

function pickVehicleId(carrierId, seed) {
  const list = demoVehicles.filter((vehicle) => vehicle.carrierId === carrierId);
  if (!list.length) {
    return demoVehicles[seed % demoVehicles.length]?.id || 'veh-001';
  }
  return list[seed % list.length].id;
}

const alertLabels = ['Inspection frein', 'Température élevée', 'Livraison prioritaire', 'Maintenance préventive', 'Capteur à recalibrer'];
const alertTypes = ['Maintenance', 'Sécurité', 'Retard'];
const alertPriorities = ['Haute', 'Moyenne', 'Basse'];

export const demoAlerts = Array.from({ length: 30 }, (_, index) => {
  const carrier = demoCarriers[index % demoCarriers.length];
  const priority = alertPriorities[index % alertPriorities.length];
  const status = index % 4 === 0 ? 'Clôturée' : 'Ouverte';
  const type = alertTypes[index % alertTypes.length];
  const label = alertLabels[index % alertLabels.length];
  return {
    id: `al-${pad(index + 1)}`,
    carrierId: carrier.id,
    vehicleId: pickVehicleId(carrier.id, index),
    priority,
    status,
    type,
    title: `${label}`,
    summary: `${label} détectée sur ${carrier.alias}.`,
    date: daysAgo(index + 1),
  };
});

const incidentTypes = ['Sécurité', 'Panne', 'Retard', 'Autre'];

export const demoIncidents = Array.from({ length: 12 }, (_, index) => {
  const carrier = demoCarriers[index % demoCarriers.length];
  const driver = demoDrivers[index % demoDrivers.length];
  const type = incidentTypes[index % incidentTypes.length];
  const status = index % 3 === 0 ? 'Clôturé' : 'Ouvert';
  return {
    id: `inc-${pad(index + 1)}`,
    carrierId: carrier.id,
    driverId: driver.id,
    type,
    status,
    summary: `${type} signalé par ${driver.name}.`,
    date: daysAgo(index * 2 + 2),
  };
});

const rawMissions = [
  { id: 'mis-001', carrierId: 'car-001', driverId: 'drv-001', status: 'En cours', startDate: daysAgo(0), departure: 'Paris', arrival: 'Lille', cargo: 'Pharma', nextStop: 'Aire de Ressons' },
  { id: 'mis-002', carrierId: 'car-001', driverId: 'drv-002', status: 'Planifiée', startDate: daysAgo(1), departure: 'Lyon', arrival: 'Grenoble', cargo: 'Equipements', nextStop: 'Entrepôt Lyon Sud' },
  { id: 'mis-003', carrierId: 'car-001', driverId: 'drv-003', status: 'Terminée', startDate: daysAgo(2), departure: 'Dijon', arrival: 'Paris', cargo: 'Agro', nextStop: 'Centre Est' },
  { id: 'mis-004', carrierId: 'car-002', driverId: 'drv-004', status: 'En cours', startDate: daysAgo(0), departure: 'Lille', arrival: 'Anvers', cargo: 'Textile', nextStop: 'Terminal Nord' },
  { id: 'mis-005', carrierId: 'car-002', driverId: 'drv-005', status: 'Planifiée', startDate: daysAgo(2), departure: 'Reims', arrival: 'Bruxelles', cargo: 'Boissons', nextStop: 'Reims Est' },
  { id: 'mis-006', carrierId: 'car-002', driverId: 'drv-006', status: 'Terminée', startDate: daysAgo(3), departure: 'Lens', arrival: 'Calais', cargo: 'Matériel', nextStop: 'Port de Calais' },
  { id: 'mis-007', carrierId: 'car-003', driverId: 'drv-007', status: 'En cours', startDate: daysAgo(0), departure: 'Toulouse', arrival: 'Marseille', cargo: 'Frais', nextStop: 'Nîmes' },
  { id: 'mis-008', carrierId: 'car-003', driverId: 'drv-008', status: 'Planifiée', startDate: daysAgo(1), departure: 'Montpellier', arrival: 'Nice', cargo: 'Cosmétique', nextStop: 'Aix-en-Provence' },
  { id: 'mis-009', carrierId: 'car-003', driverId: 'drv-007', status: 'Terminée', startDate: daysAgo(4), departure: 'Bordeaux', arrival: 'Toulouse', cargo: 'Boissons', nextStop: 'Aire d’Agen' },
  { id: 'mis-010', carrierId: 'car-001', driverId: 'drv-001', status: 'Planifiée', startDate: daysAgo(3), departure: 'Paris', arrival: 'Rouen', cargo: 'Retail', nextStop: 'Entrepôt Normandie' },
  { id: 'mis-011', carrierId: 'car-002', driverId: 'drv-004', status: 'Terminée', startDate: daysAgo(5), departure: 'Lille', arrival: 'Luxembourg', cargo: 'Electronique', nextStop: 'Border Check' },
  { id: 'mis-012', carrierId: 'car-001', driverId: 'drv-002', status: 'En cours', startDate: daysAgo(0), departure: 'Chartres', arrival: 'Paris', cargo: 'Retail', nextStop: 'Dreux' },
  { id: 'mis-013', carrierId: 'car-002', driverId: 'drv-005', status: 'Terminée', startDate: daysAgo(6), departure: 'Calais', arrival: 'Roubaix', cargo: 'Agro', nextStop: 'Entrepôt Nord' },
  { id: 'mis-014', carrierId: 'car-003', driverId: 'drv-008', status: 'En cours', startDate: daysAgo(0), departure: 'Perpignan', arrival: 'Bayonne', cargo: 'Frais', nextStop: 'Narbonne' },
  { id: 'mis-015', carrierId: 'car-003', driverId: 'drv-007', status: 'Planifiée', startDate: daysAgo(2), departure: 'Nice', arrival: 'Toulon', cargo: 'Industrie', nextStop: 'Aire de Cannes' },
];

export const demoMissions = rawMissions.map((mission) => {
  const driver = demoDrivers.find((item) => item.id === mission.driverId);
  return { ...mission, driverName: driver?.name || mission.driverId };
});

function stringHash(input = 'fleet') {
  return input.split('').reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) >>> 0, 0);
}

function pickByEmail(collection, email) {
  if (!collection.length) {
    return null;
  }
  if (email) {
    const normalized = email.toLowerCase();
    const exact = collection.find((item) => item.email?.toLowerCase() === normalized);
    if (exact) {
      return exact;
    }
  }
  const hash = stringHash(email || 'default');
  return collection[hash % collection.length];
}

function resolveCarrier(email) {
  if (email) {
    const normalized = email.toLowerCase();
    const domainMatch = demoCarriers.find((carrier) => normalized.includes(carrier.emailDomain));
    if (domainMatch) {
      return domainMatch;
    }
  }
  return pickByEmail(demoCarriers, email) || demoCarriers[0];
}

function resolveDriver(email) {
  return pickByEmail(demoDrivers, email) || demoDrivers[0];
}

function getWeekKey(date) {
  const target = new Date(date);
  const firstDay = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const days = Math.floor((target - firstDay) / DAY_IN_MS);
  const week = Math.floor((days + firstDay.getUTCDay() + 1) / 7) + 1;
  return `S${String(week).padStart(2, '0')}`;
}

function groupByWeek(records, carrierId) {
  const map = new Map();
  records
    .filter((item) => !carrierId || item.carrierId === carrierId)
    .forEach((item) => {
      const key = getWeekKey(item.date);
      const current = map.get(key) || 0;
      map.set(key, current + 1);
    });
  const entries = Array.from(map.entries()).sort(([a], [b]) => (a > b ? 1 : -1));
  return entries.map(([label, value]) => ({ label, value }));
}

function groupByType(records, typeKey, carrierId) {
  const map = new Map();
  records
    .filter((item) => !carrierId || item.carrierId === carrierId)
    .forEach((item) => {
      const key = item[typeKey] || 'Autre';
      const current = map.get(key) || 0;
      map.set(key, current + 1);
    });
  return Array.from(map.entries()).map(([label, value]) => ({ label, value }));
}

function computeAvailability(vehicles) {
  if (!vehicles.length) {
    return 0;
  }
  const available = vehicles.filter((vehicle) => vehicle.status !== 'Maintenance').length;
  return Math.round((available / vehicles.length) * 100);
}

function getCurrentMonthIncidents(records) {
  const today = new Date();
  const month = today.getMonth();
  const year = today.getFullYear();
  return records.filter((incident) => {
    const date = new Date(incident.date);
    return date.getMonth() === month && date.getFullYear() === year;
  });
}

function getTodayMissions(records, driverId) {
  const today = new Date();
  return records.filter((mission) => {
    const date = new Date(mission.startDate);
    return (
      (!driverId || mission.driverId === driverId) &&
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  });
}

function countRecordsToday(records) {
  const today = new Date();
  return records.filter((record) => {
    const date = new Date(record.date);
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  }).length;
}

function buildCarrierDashboard(carrier, email) {
  const relatedVehicles = demoVehicles.filter((vehicle) => vehicle.carrierId === carrier.id);
  const relatedDrivers = demoDrivers.filter((driver) => driver.carrierId === carrier.id);
  const relatedAlerts = demoAlerts.filter((alert) => alert.carrierId === carrier.id).sort((a, b) => (a.date < b.date ? 1 : -1));
  const relatedIncidents = demoIncidents.filter((incident) => incident.carrierId === carrier.id);
  const relatedMissions = demoMissions.filter((mission) => mission.carrierId === carrier.id).sort((a, b) => (a.startDate < b.startDate ? 1 : -1));
  const missionsWithNames = relatedMissions.map((mission) => {
    if (mission.driverName) {
      return mission;
    }
    const driver = demoDrivers.find((item) => item.id === mission.driverId);
    return { ...mission, driverName: driver?.name || mission.driverId };
  });

  const openAlerts = relatedAlerts.filter((alert) => alert.status === 'Ouverte');
  const incidentsThisMonth = getCurrentMonthIncidents(relatedIncidents);
  const missionsInProgress = relatedMissions.filter((mission) => mission.status === 'En cours');

  const kpis = [
    { label: 'Véhicules du parc', value: relatedVehicles.length },
    { label: 'Conducteurs actifs', value: relatedDrivers.filter((driver) => driver.status !== 'Suspendu').length },
    { label: 'Missions en cours', value: missionsInProgress.length },
    { label: 'Alertes ouvertes', value: openAlerts.length },
    { label: 'Incidents ce mois', value: incidentsThisMonth.length },
    { label: 'Taux de disponibilité', value: `${computeAvailability(relatedVehicles)}%` },
  ];

  return {
    carrier,
    email,
    kpis,
    alertsByWeek: groupByWeek(demoAlerts, carrier.id),
    incidentBreakdown: groupByType(relatedIncidents.length ? relatedIncidents : demoIncidents, 'type', carrier.id),
    recentAlerts: relatedAlerts.slice(0, 5),
    recentMissions: missionsWithNames.slice(0, 5),
  };
}

function buildDriverDashboard(driver, email) {
  const carrier = demoCarriers.find((item) => item.id === driver.carrierId) || demoCarriers[0];
  const driverAlerts = demoAlerts.filter((alert) => alert.vehicleId === driver.primaryVehicleId).sort((a, b) => (a.date < b.date ? 1 : -1));
  const driverIncidents = demoIncidents.filter((incident) => incident.driverId === driver.id);
  const driverMissions = demoMissions.filter((mission) => mission.driverId === driver.id).sort((a, b) => (a.startDate < b.startDate ? 1 : -1));
  const missionsToday = getTodayMissions(driverMissions, driver.id);
  const activeAlerts = driverAlerts.filter((alert) => alert.status === 'Ouverte');
  const weeklyMileage = 420 + (stringHash(driver.id) % 180);
  const nextMission = driverMissions.find((mission) => mission.status !== 'Terminée') || driverMissions[0] || null;

  const history = [...driverAlerts.slice(0, 4), ...driverIncidents.slice(0, 4)]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 6)
    .map((item) => ({
      id: item.id,
      type: item.type || item.priority || 'Info',
      status: item.status,
      date: item.date,
      summary: item.summary || item.title,
    }));

  return {
    driver,
    carrier,
    email,
    kpis: [
      { label: 'Missions aujourd’hui', value: missionsToday.length },
      { label: 'Alertes actives', value: activeAlerts.length },
      { label: 'Incidents déclarés', value: driverIncidents.length },
      { label: 'Kilométrage semaine', value: `${weeklyMileage} km` },
    ],
    nextMission,
    history,
    recentAlerts: driverAlerts.slice(0, 3),
  };
}

export function getCarrierDashboardData(email) {
  const carrier = resolveCarrier(email);
  return buildCarrierDashboard(carrier, email);
}

export function getDriverDashboardData(email) {
  const driver = resolveDriver(email);
  return buildDriverDashboard(driver, email);
}

export function getAdminOverviewData() {
  const totals = {
    carriers: demoCarriers.length,
    drivers: demoDrivers.length,
    vehicles: demoVehicles.length,
    openAlerts: demoAlerts.filter((alert) => alert.status === 'Ouverte').length,
    incidentsToday: countRecordsToday(demoIncidents),
    resolutionRate: `${Math.round((demoAlerts.filter((alert) => alert.status === 'Clôturée').length / demoAlerts.length) * 100)}%`,
  };

  const alertTrend = groupByWeek(demoAlerts);
  const incidentBreakdown = groupByType(demoIncidents, 'type');
  const fleetActivity = demoCarriers.map((carrier) => ({
    carrier: carrier.alias,
    alerts: demoAlerts.filter((alert) => alert.carrierId === carrier.id).length,
  }));

  const criticalAlerts = demoAlerts
    .filter((alert) => alert.priority === 'Haute')
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 10)
    .map((alert) => {
      const carrier = demoCarriers.find((item) => item.id === alert.carrierId);
      return { ...alert, carrierName: carrier?.alias || carrier?.name || '—' };
    });

  return {
    totals,
    alertTrend,
    incidentBreakdown,
    fleetActivity,
    criticalAlerts,
    carriers: demoCarriers,
  };
}

```