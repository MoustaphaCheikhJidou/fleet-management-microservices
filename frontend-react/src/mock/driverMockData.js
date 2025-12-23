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

function timeLabel(minutes) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.round(minutes / 60);
  return `${hours} h`;
}

function buildKpis(missions, alerts, rnd) {
  const missionsToday = missions.filter((m) => m.day === 'Aujourd’hui').length || missions.length;
  const unreadAlerts = alerts.filter((a) => a.status === 'À traiter').length;
  const kmWeek = 320 + Math.floor(rnd() * 120);
  const onDuty = rnd() > 0.3;
  return {
    missionsToday,
    unreadAlerts,
    kmWeek,
    dutyStatus: onDuty ? 'En service' : 'Hors service',
  };
}

function buildMissions(rnd) {
  const routes = ['Paris → Lille', 'Lyon → Grenoble', 'Toulouse → Bordeaux', 'Nantes → Rennes'];
  const statuses = ['Planifiée', 'En cours', 'À confirmer'];
  const stops = ['Entrepôt Est', 'Hub Nord', 'Base Ouest', 'Plateforme Sud'];
  return Array.from({ length: 6 }).map((_, idx) => ({
    id: idx + 1,
    route: pick(routes, rnd),
    status: pick(statuses, rnd),
    startTime: `${8 + idx}:00`,
    day: idx < 2 ? 'Aujourd’hui' : 'Cette semaine',
    nextStop: pick(stops, rnd),
  }));
}

function buildAlerts(rnd) {
  const types = ['Température', 'Vitesse', 'Temps de pause', 'Surveillance chargement'];
  const statuses = ['À traiter', 'Suivie', 'Clôturée'];
  const severities = ['Élevée', 'Moyenne', 'Basse'];
  return Array.from({ length: 5 }).map((_, idx) => ({
    id: idx + 1,
    type: pick(types, rnd),
    severity: pick(severities, rnd),
    status: pick(statuses, rnd),
    timeAgo: timeLabel(15 + Math.floor(rnd() * 180)),
  }));
}

function buildPayments(rnd) {
  const methods = ['Virement', 'Carte', 'Espèces'];
  const statuses = ['Payé', 'En cours', 'À venir'];
  const missions = ['Paris → Lille', 'Lyon → Grenoble', 'Toulouse → Bordeaux', 'Nantes → Rennes'];
  return Array.from({ length: 5 }).map((_, idx) => ({
    id: idx + 1,
    reference: `PAY-${2300 + idx}`,
    mission: pick(missions, rnd),
    amount: 850 + Math.floor(rnd() * 220),
    status: pick(statuses, rnd),
    method: pick(methods, rnd),
    date: 'Cette semaine',
  }));
}

export function generateDriverMockData(seed = Date.now()) {
  const rnd = mulberry32(seed >>> 0);
  const missions = buildMissions(rnd);
  const alerts = buildAlerts(rnd);
  const payments = buildPayments(rnd);
  const kpis = buildKpis(missions, alerts, rnd);

  return {
    seed,
    kpis,
    tables: {
      missions,
      alerts,
      payments,
    },
  };
}
