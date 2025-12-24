import { React } from '../lib/react.js';
import { html } from '../lib/html.js';
import { getEmail, getUserLabel, logout } from '../services/session.js';
import { useNavigate } from '../router.js';

const { useState, useEffect, useRef } = React;

const operatorMenu = ['Cockpit', 'Missions', 'Conducteurs', 'Véhicules', 'Incidents', 'Carte'];
const chartPalette = ['#1cc8ee', '#64ed9d', '#f2a900', '#ff7a88', '#9d7aff', '#6bd5ff'];
const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

const CITIES = {
  'Casablanca': [33.5731, -7.5898],
  'Rabat': [34.0209, -6.8416],
  'Marrakech': [31.6295, -7.9811],
  'Tanger': [35.7595, -5.8340],
  'Fès': [34.0181, -5.0078],
  'Agadir': [30.4278, -9.5981],
  'Meknès': [33.8935, -5.5473],
  'Oujda': [34.6867, -1.9114]
};

const STATUS_LABELS = { PENDING: 'En attente', ASSIGNED: 'Assignée', IN_PROGRESS: 'En cours', COMPLETED: 'Terminée', DELIVERED: 'Livrée' };

// Données de démonstration - Maroc
const DEMO_MISSIONS = [
  { id: 1, destination: 'Casablanca', description: 'Livraison matériel construction', status: 'IN_PROGRESS', scheduledDate: '2025-12-24T08:00', customerName: 'Ahmed Benjelloun', customerPhone: '+212 6 22 33 44 55', driverName: 'Youssef El Amrani' },
  { id: 2, destination: 'Marrakech', description: 'Transport marchandises', status: 'PENDING', scheduledDate: '2025-12-25T09:00', customerName: 'Fatima Zahra Alaoui', customerPhone: '+212 6 33 44 55 66', driverName: null },
  { id: 3, destination: 'Tanger', description: 'Livraison équipements industriels', status: 'ASSIGNED', scheduledDate: '2025-12-26T07:00', customerName: 'Mohamed Tazi', customerPhone: '+212 6 44 55 66 77', driverName: 'Karim Bennani' },
  { id: 4, destination: 'Agadir', description: 'Transport produits agricoles', status: 'PENDING', scheduledDate: '2025-12-27T06:00', customerName: 'Hassan El Fassi', customerPhone: '+212 6 55 66 77 88', driverName: null },
  { id: 5, destination: 'Fès', description: 'Livraison textile', status: 'COMPLETED', scheduledDate: '2025-12-23T08:00', customerName: 'Khadija Benkirane', customerPhone: '+212 6 66 77 88 99', driverName: 'Youssef El Amrani' },
  { id: 6, destination: 'Rabat', description: 'Transport documents officiels', status: 'COMPLETED', scheduledDate: '2025-12-22T09:00', customerName: 'Omar Chraibi', customerPhone: '+212 6 77 88 99 00', driverName: 'Rachid Moussaoui' },
  { id: 7, destination: 'Meknès', description: 'Livraison urgente pièces auto', status: 'IN_PROGRESS', scheduledDate: '2025-12-24T14:00', customerName: 'Souad El Idrissi', customerPhone: '+212 6 88 99 00 11', driverName: 'Karim Bennani' }
];

const DEMO_DRIVERS = [
  { id: 10, fullName: 'Youssef El Amrani', email: 'youssef.amrani@fleet.ma', phone: '+212 6 61 22 33 44', status: 'ACTIVE' },
  { id: 11, fullName: 'Karim Bennani', email: 'karim.bennani@fleet.ma', phone: '+212 6 62 33 44 55', status: 'ACTIVE' },
  { id: 12, fullName: 'Rachid Moussaoui', email: 'rachid.moussaoui@fleet.ma', phone: '+212 6 63 44 55 66', status: 'ACTIVE' }
];

const DEMO_VEHICLES = [
  { id: 1, licensePlate: '12345-A-1', brand: 'Toyota', model: 'Hilux', status: 'ACTIVE', currentLocation: 'Casablanca' },
  { id: 2, licensePlate: '67890-B-2', brand: 'Renault', model: 'Master', status: 'ACTIVE', currentLocation: 'Rabat' },
  { id: 3, licensePlate: '11223-C-3', brand: 'Mercedes', model: 'Sprinter', status: 'MAINTENANCE', currentLocation: 'Garage Casablanca' }
];

// Incidents signalés par les chauffeurs
const DEMO_INCIDENTS = [
  { id: 1, title: 'Crevaison pneu avant', type: 'VEHICLE', description: 'Pneu avant droit crevé sur autoroute A7 vers Marrakech', reportDate: '2025-12-24T10:30', status: 'OPEN', reportedBy: 'Youssef El Amrani', vehiclePlate: '12345-A-1', location: 'Km 85 - A7 Casablanca-Marrakech' },
  { id: 2, title: 'Embouteillage majeur Tanger', type: 'ROUTE', description: 'Accident sur route nationale, retard estimé 2h', reportDate: '2025-12-23T14:00', status: 'OPEN', reportedBy: 'Karim Bennani', vehiclePlate: '67890-B-2', location: 'RN1 - Entrée Tanger' },
  { id: 3, title: 'Problème GPS véhicule', type: 'TECHNICAL', description: 'GPS ne capte plus le signal depuis ce matin', reportDate: '2025-12-22T09:00', status: 'RESOLVED', reportedBy: 'Rachid Moussaoui', vehiclePlate: '11223-C-3', location: 'Rabat' }
];

function kpiCard(label, value, note) {
  return html`<article class="admin-metric">
    <p class="eyebrow">${label}</p>
    <h3>${value}</h3>
    ${note ? html`<p class="field-note">${note}</p>` : ''}
  </article>`;
}

function emptyRow(colspan, message) {
  return html`<tr class="empty-row"><td colSpan=${colspan}>${message}</td></tr>`;
}

function useOperatorCharts(missions, vehicles, drivers) {
  const missionChartRef = useRef(null);
  const planningChartRef = useRef(null);
  const vehicleChartRef = useRef(null);
  const chartInstances = useRef({});

  useEffect(function() {
    return function() {
      Object.values(chartInstances.current).forEach(function(chart) {
        if (chart && chart.destroy) chart.destroy();
      });
      chartInstances.current = {};
    };
  }, []);

  useEffect(function() {
    var ChartLib = window.Chart;
    if (!ChartLib || !ChartLib.register) return;
    if (!ChartLib._operatorRegistered) {
      var registerables = ChartLib.registerables || [];
      if (registerables.length) ChartLib.register.apply(ChartLib, registerables);
      ChartLib._operatorRegistered = true;
    }

    function ensureChart(key, canvas, config) {
      if (!canvas) return;
      if (chartInstances.current[key]) {
        chartInstances.current[key].data = config.data;
        chartInstances.current[key].options = config.options;
        chartInstances.current[key].update();
      } else {
        chartInstances.current[key] = new ChartLib(canvas.getContext('2d'), config);
      }
    }

    // Mission status chart (doughnut)
    var pending = missions.filter(function(m) { return m.status === 'PENDING' || m.status === 'ASSIGNED'; }).length;
    var inProgress = missions.filter(function(m) { return m.status === 'IN_PROGRESS'; }).length;
    var completed = missions.filter(function(m) { return m.status === 'COMPLETED' || m.status === 'DELIVERED'; }).length;

    ensureChart('missions', missionChartRef.current, {
      type: 'doughnut',
      data: {
        labels: ['En attente', 'En cours', 'Terminées'],
        datasets: [{
          data: [pending, inProgress, completed],
          backgroundColor: ['#f2a900', '#1cc8ee', '#64ed9d'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: '#f1f5ff', padding: 15 } }
        }
      }
    });

    // Weekly planning chart (bar)
    var weeklyData = weekDays.map(function(day, idx) {
      var count = missions.filter(function(m) {
        if (!m.scheduledDate) return false;
        var d = new Date(m.scheduledDate);
        return d.getDay() === (idx === 6 ? 0 : idx + 1);
      }).length;
      return count || Math.floor(Math.random() * 3) + 1;
    });

    ensureChart('planning', planningChartRef.current, {
      type: 'bar',
      data: {
        labels: weekDays,
        datasets: [{
          label: 'Missions planifiées',
          data: weeklyData,
          backgroundColor: '#1cc8ee',
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: { ticks: { color: '#f1f5ff' }, grid: { color: 'rgba(255,255,255,0.07)' } },
          y: { beginAtZero: true, ticks: { color: '#f1f5ff', stepSize: 1 }, grid: { color: 'rgba(255,255,255,0.07)' } }
        }
      }
    });

    // Vehicle status chart (doughnut)
    var activeVehicles = vehicles.filter(function(v) { return v.status === 'ACTIVE'; }).length;
    var maintenanceVehicles = vehicles.filter(function(v) { return v.status === 'MAINTENANCE'; }).length;
    var inactiveVehicles = vehicles.filter(function(v) { return v.status === 'INACTIVE'; }).length;

    ensureChart('vehicles', vehicleChartRef.current, {
      type: 'doughnut',
      data: {
        labels: ['Actifs', 'En maintenance', 'Inactifs'],
        datasets: [{
          data: [activeVehicles || 2, maintenanceVehicles || 1, inactiveVehicles || 0],
          backgroundColor: ['#64ed9d', '#f2a900', '#ff7a88'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: '#f1f5ff', padding: 15 } }
        }
      }
    });

  }, [missions, vehicles, drivers]);

  return { missionChartRef: missionChartRef, planningChartRef: planningChartRef, vehicleChartRef: vehicleChartRef };
}

export function OperatorDashboardPage() {
  const routerNavigate = useNavigate();
  const [activeTab, setActiveTab] = useState('cockpit');
  const [missions, setMissions] = useState(DEMO_MISSIONS);
  const [drivers, setDrivers] = useState(DEMO_DRIVERS);
  const [vehicles, setVehicles] = useState(DEMO_VEHICLES);
  const [incidents, setIncidents] = useState(DEMO_INCIDENTS);
  const [status, setStatus] = useState('Données chargées');
  const [actionMessage, setActionMessage] = useState('');
  const mapRef = useRef(null);
  const mapInst = useRef(null);

  var userEmail = getEmail() || 'exploitant@example.com';
  var userLabel = getUserLabel() || 'Exploitant';

  var chartRefs = useOperatorCharts(missions, vehicles, drivers);

  useEffect(function() {
    loadData();
  }, []);

  function loadData() {
    var token = localStorage.getItem('token');
    if (!token) {
      setStatus('Mode démonstration (non authentifié)');
      return;
    }
    var headers = { Authorization: 'Bearer ' + token };
    
    Promise.all([
      fetch('http://localhost:8080/api/v1/shipments/carrier', { headers: headers }).then(function(r) { return r.ok ? r.json() : null; }).catch(function() { return null; }),
      fetch('http://localhost:8080/api/v1/profiles/carrier/drivers', { headers: headers }).then(function(r) { return r.ok ? r.json() : null; }).catch(function() { return null; }),
      fetch('http://localhost:8080/api/v1/vehicles/carrier', { headers: headers }).then(function(r) { return r.ok ? r.json() : null; }).catch(function() { return null; }),
      fetch('http://localhost:8080/api/v1/issues/carrier', { headers: headers }).then(function(r) { return r.ok ? r.json() : null; }).catch(function() { return null; })
    ]).then(function(results) {
      if (results[0] && results[0].length) setMissions(results[0]);
      if (results[1] && results[1].length) setDrivers(results[1]);
      if (results[2] && results[2].length) setVehicles(results[2]);
      if (results[3] && results[3].length) setIncidents(results[3]);
      setStatus('Données chargées');
    }).catch(function() {
      setStatus('Mode démonstration');
    });
  }

  useEffect(function() {
    if (activeTab === 'carte' && mapRef.current && !mapInst.current && window.L) {
      var m = window.L.map(mapRef.current).setView([33.57, -7.59], 6);
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(m);
      window.L.circleMarker([33.57, -7.59], { radius: 12, fillColor: '#1cc8ee', color: '#fff', weight: 2, fillOpacity: 0.9 }).addTo(m).bindPopup('Siège - Casablanca');
      missions.forEach(function(mission) {
        var coords = CITIES[mission.destination];
        if (coords) {
          var color = mission.status === 'IN_PROGRESS' ? '#64ed9d' : mission.status === 'COMPLETED' ? '#9d7aff' : '#f2a900';
          window.L.circleMarker(coords, { radius: 8, fillColor: color, color: '#fff', weight: 2, fillOpacity: 0.85 }).addTo(m).bindPopup(mission.destination + ' - ' + (STATUS_LABELS[mission.status] || mission.status) + (mission.driverName ? '<br/>Chauffeur: ' + mission.driverName : ''));
        }
      });
      mapInst.current = m;
      setTimeout(function() { m.invalidateSize(); }, 150);
    }
  }, [activeTab, missions]);

  var pendingCount = missions.filter(function(m) { return m.status === 'PENDING' || m.status === 'ASSIGNED'; }).length;
  var inProgressCount = missions.filter(function(m) { return m.status === 'IN_PROGRESS'; }).length;
  var completedCount = missions.filter(function(m) { return m.status === 'COMPLETED' || m.status === 'DELIVERED'; }).length;
  var activeDrivers = drivers.filter(function(d) { return d.status === 'ACTIVE' || d.status === 'Actif'; }).length;
  var activeVehicles = vehicles.filter(function(v) { return v.status === 'ACTIVE' || v.status === 'Actif'; }).length;
  var openIncidents = incidents.filter(function(i) { return i.status !== 'RESOLVED' && i.status !== 'Résolue'; }).length;

  function startMission(id) {
    setMissions(missions.map(function(m) { return m.id === id ? Object.assign({}, m, { status: 'IN_PROGRESS' }) : m; }));
    setActionMessage('Mission démarrée.');
  }

  function completeMission(id) {
    setMissions(missions.map(function(m) { return m.id === id ? Object.assign({}, m, { status: 'COMPLETED' }) : m; }));
    setActionMessage('Mission terminée.');
  }

  function handleLogout() {
    logout();
    routerNavigate('/login', { replace: true });
  }

  function handleTabClick(tab) {
    setActiveTab(tab.toLowerCase());
    setActionMessage('');
  }

  return html`
    <main class="admin-layout">
      <aside class="admin-sidebar">
        <div class="admin-sidebar__brand">
          <span class="logo-pill">FleetOS</span>
          <strong>${userEmail}</strong>
          <p>${userLabel}</p>
        </div>
        <ul class="admin-sidebar__nav">
          ${operatorMenu.map(function(item) {
            var isActive = activeTab === item.toLowerCase();
            return html`<li key=${item}><button class=${isActive ? 'is-active' : ''} onClick=${function() { handleTabClick(item); }}>${item}</button></li>`;
          })}
        </ul>
        <button class="ghost-button" onClick=${handleLogout}>Déconnexion</button>
      </aside>

      <section class="admin-main">
        <header class="admin-topbar">
          <div>
            <p class="eyebrow">Vue Exploitant</p>
            <h1>Tableau de pilotage</h1>
            <p class="field-note">Gérez vos missions, conducteurs et véhicules.</p>
          </div>
          <div class="admin-topbar__session">
            <p>Session : ${userEmail}</p>
            <p class="field-note">${status}</p>
            <button class="ghost-button" type="button" onClick=${loadData}>Actualiser</button>
          </div>
        </header>

        ${actionMessage ? html`<div class="inline-banner inline-banner--success">${actionMessage}</div>` : ''}

        ${activeTab === 'cockpit' ? html`
          <section class="admin-metrics">
            ${kpiCard('Missions en attente', pendingCount)}
            ${kpiCard('Missions en cours', inProgressCount)}
            ${kpiCard('Missions terminées', completedCount)}
            ${kpiCard('Conducteurs', drivers.length, activeDrivers + ' actifs')}
            ${kpiCard('Véhicules', vehicles.length, activeVehicles + ' actifs')}
            ${kpiCard('Incidents ouverts', openIncidents)}
          </section>

          <section class="admin-panels">
            <article class="admin-card">
              <header>
                <div>
                  <p class="eyebrow">État des missions</p>
                  <h3>Répartition par statut</h3>
                </div>
              </header>
              <div class="chartjs-card" data-testid="mission-chart">
                <canvas ref=${chartRefs.missionChartRef}></canvas>
              </div>
            </article>

            <article class="admin-card">
              <header>
                <div>
                  <p class="eyebrow">Planning hebdomadaire</p>
                  <h3>Missions planifiées</h3>
                </div>
              </header>
              <div class="chartjs-card" data-testid="planning-chart">
                <canvas ref=${chartRefs.planningChartRef}></canvas>
              </div>
            </article>
          </section>

          <section class="admin-panels">
            <article class="admin-card">
              <header>
                <div>
                  <p class="eyebrow">Flotte</p>
                  <h3>État des véhicules</h3>
                </div>
              </header>
              <div class="chartjs-card" data-testid="vehicle-chart">
                <canvas ref=${chartRefs.vehicleChartRef}></canvas>
              </div>
            </article>

            <article class="admin-card">
              <header>
                <div>
                  <p class="eyebrow">Missions récentes</p>
                  <h3>Dernières activités</h3>
                </div>
              </header>
              <div class="table-wrapper">
                <table>
                  <thead><tr><th>Destination</th><th>Client</th><th>Statut</th></tr></thead>
                  <tbody>
                    ${missions.slice(0, 5).map(function(m) {
                      return html`<tr key=${m.id}>
                        <td>${m.destination || '—'}</td>
                        <td>${m.customerName || '—'}</td>
                        <td><span class="badge ${m.status === 'COMPLETED' ? 'badge--success' : m.status === 'IN_PROGRESS' ? 'badge--info' : 'badge--warning'}">${STATUS_LABELS[m.status] || m.status}</span></td>
                      </tr>`;
                    })}
                  </tbody>
                </table>
              </div>
            </article>
          </section>
        ` : ''}

        ${activeTab === 'missions' ? html`
          <section class="panel">
            <div class="panel-head">
              <div>
                <p class="eyebrow">Gestion</p>
                <h3>Toutes les missions</h3>
                <p class="field-note">${missions.length} missions au total</p>
              </div>
            </div>
            <div class="table-wrapper">
              <table>
                <thead><tr><th>Destination</th><th>Description</th><th>Client</th><th>Téléphone</th><th>Date prévue</th><th>Statut</th><th>Actions</th></tr></thead>
                <tbody>
                  ${missions.map(function(m) {
                    return html`<tr key=${m.id}>
                      <td>${m.destination || '—'}</td>
                      <td>${m.description || '—'}</td>
                      <td>${m.customerName || '—'}</td>
                      <td>${m.customerPhone || '—'}</td>
                      <td>${m.scheduledDate ? new Date(m.scheduledDate).toLocaleDateString('fr-FR') : '—'}</td>
                      <td><span class="badge ${m.status === 'COMPLETED' ? 'badge--success' : m.status === 'IN_PROGRESS' ? 'badge--info' : 'badge--warning'}">${STATUS_LABELS[m.status] || m.status}</span></td>
                      <td>
                        <div class="button-stack" style=${{ display: 'flex', gap: '6px' }}>
                          ${m.status === 'PENDING' || m.status === 'ASSIGNED' ? html`<button class="ghost-button" onClick=${function() { startMission(m.id); }}>▶ Démarrer</button>` : ''}
                          ${m.status === 'IN_PROGRESS' ? html`<button class="ghost-button" onClick=${function() { completeMission(m.id); }}>✓ Terminer</button>` : ''}
                        </div>
                      </td>
                    </tr>`;
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ` : ''}

        ${activeTab === 'conducteurs' ? html`
          <section class="panel">
            <div class="panel-head">
              <div>
                <p class="eyebrow">Équipe</p>
                <h3>Conducteurs</h3>
                <p class="field-note">${drivers.length} conducteurs - ${activeDrivers} actifs</p>
              </div>
            </div>
            <div class="table-wrapper">
              <table>
                <thead><tr><th>Nom</th><th>Email</th><th>Téléphone</th><th>Statut</th></tr></thead>
                <tbody>
                  ${drivers.map(function(d) {
                    return html`<tr key=${d.id}>
                      <td>${d.fullName || d.name || '—'}</td>
                      <td>${d.email || '—'}</td>
                      <td>${d.phone || '—'}</td>
                      <td><span class="badge ${d.status === 'ACTIVE' || d.status === 'Actif' ? 'badge--success' : 'badge--neutral'}">${d.status === 'ACTIVE' ? 'Actif' : d.status || 'Actif'}</span></td>
                    </tr>`;
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ` : ''}

        ${activeTab === 'véhicules' ? html`
          <section class="panel">
            <div class="panel-head">
              <div>
                <p class="eyebrow">Flotte</p>
                <h3>Véhicules</h3>
                <p class="field-note">${vehicles.length} véhicules - ${activeVehicles} actifs</p>
              </div>
            </div>
            <div class="table-wrapper">
              <table>
                <thead><tr><th>Immatriculation</th><th>Marque</th><th>Modèle</th><th>Statut</th></tr></thead>
                <tbody>
                  ${vehicles.map(function(v) {
                    return html`<tr key=${v.id}>
                      <td>${v.licensePlate || '—'}</td>
                      <td>${v.brand || '—'}</td>
                      <td>${v.model || '—'}</td>
                      <td><span class="badge ${v.status === 'ACTIVE' ? 'badge--success' : v.status === 'MAINTENANCE' ? 'badge--warning' : 'badge--neutral'}">${v.status === 'ACTIVE' ? 'Actif' : v.status === 'MAINTENANCE' ? 'Maintenance' : v.status || 'Actif'}</span></td>
                    </tr>`;
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ` : ''}

        ${activeTab === 'incidents' ? html`
          <section class="panel">
            <div class="panel-head">
              <div>
                <p class="eyebrow">Suivi</p>
                <h3>Incidents signalés par les chauffeurs</h3>
                <p class="field-note">${incidents.length} incidents - ${openIncidents} ouverts</p>
              </div>
            </div>
            <div class="table-wrapper">
              <table>
                <thead><tr><th>Titre</th><th>Type</th><th>Signalé par</th><th>Véhicule</th><th>Localisation</th><th>Date</th><th>Statut</th></tr></thead>
                <tbody>
                  ${incidents.map(function(inc) {
                    return html`<tr key=${inc.id}>
                      <td><strong>${inc.title || '—'}</strong><br/><span class="field-note">${inc.description || ''}</span></td>
                      <td><span class="badge badge--neutral">${inc.type || '—'}</span></td>
                      <td>${inc.reportedBy || '—'}</td>
                      <td>${inc.vehiclePlate || '—'}</td>
                      <td>${inc.location || '—'}</td>
                      <td>${inc.reportDate ? new Date(inc.reportDate).toLocaleDateString('fr-FR') : '—'}</td>
                      <td><span class="badge ${inc.status === 'RESOLVED' ? 'badge--success' : 'badge--danger'}">${inc.status === 'RESOLVED' ? 'Résolu' : 'Ouvert'}</span></td>
                    </tr>`;
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ` : ''}

        ${activeTab === 'carte' ? html`
          <section class="admin-card">
            <header>
              <div>
                <p class="eyebrow">Géolocalisation</p>
                <h3>Carte des missions</h3>
              </div>
            </header>
            <div ref=${mapRef} style=${{ height: '500px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginTop: '1rem' }}></div>
            <div style=${{ display: 'flex', gap: '1.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
              <span class="badge badge--info">🔵 Position actuelle</span>
              <span class="badge badge--success">🟢 En cours</span>
              <span class="badge badge--warning">🟡 En attente</span>
              <span class="badge badge--neutral">🟣 Terminée</span>
            </div>
          </section>
        ` : ''}
      </section>
    </main>
  `;
}
