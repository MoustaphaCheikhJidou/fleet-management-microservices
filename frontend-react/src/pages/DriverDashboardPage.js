
// Nouvelle version FleetOS chauffeur
import { React } from '../lib/react.js';
import { html } from '../lib/html.js';
import { getEmail, getUserLabel, logout } from '../services/session.js';
import { useNavigate } from '../router.js';

const { useState, useEffect, useRef } = React;

const driverMenu = ['Vue d’ensemble', 'Missions', 'Incidents', 'Véhicule', 'Carte', 'Notifications'];
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

// Données de démonstration pour le chauffeur
const DEMO_DRIVER = {
  id: 10,
  fullName: 'Youssef El Amrani',
  email: 'youssef.amrani@fleet.ma',
  phone: '+212 6 61 22 33 44',
  photo: 'https://randomuser.me/api/portraits/men/32.jpg',
  vehicle: {
    licensePlate: '12345-A-1',
    brand: 'Toyota',
    model: 'Hilux',
    status: 'ACTIVE',
    nextMaintenance: '2026-01-15',
    recentIncidents: [
      { id: 1, title: 'Crevaison pneu avant', date: '2025-12-24', status: 'RESOLVED' }
    ]
  }
};

const DEMO_MISSIONS = [
  { id: 1, destination: 'Casablanca', description: 'Livraison matériel construction', status: 'IN_PROGRESS', scheduledDate: '2025-12-24T08:00', customerName: 'Ahmed Benjelloun', customerPhone: '+212 6 22 33 44 55' },
  { id: 2, destination: 'Marrakech', description: 'Transport marchandises', status: 'PENDING', scheduledDate: '2025-12-25T09:00', customerName: 'Fatima Zahra Alaoui', customerPhone: '+212 6 33 44 55 66' },
  { id: 3, destination: 'Tanger', description: 'Livraison équipements industriels', status: 'ASSIGNED', scheduledDate: '2025-12-26T07:00', customerName: 'Mohamed Tazi', customerPhone: '+212 6 44 55 66 77' },
  { id: 4, destination: 'Agadir', description: 'Transport produits agricoles', status: 'PENDING', scheduledDate: '2025-12-27T06:00', customerName: 'Hassan El Fassi', customerPhone: '+212 6 55 66 77 88' },
  { id: 5, destination: 'Fès', description: 'Livraison textile', status: 'COMPLETED', scheduledDate: '2025-12-23T08:00', customerName: 'Khadija Benkirane', customerPhone: '+212 6 66 77 88 99' }
];

const DEMO_INCIDENTS = [
  { id: 1, type: 'VEHICLE', title: 'Crevaison pneu avant', description: 'Pneu avant droit crevé sur autoroute A7 vers Marrakech', date: '2025-12-24T10:30', status: 'RESOLVED', location: 'Km 85 - A7 Casablanca-Marrakech', response: 'Réparé par l’exploitation le 24/12.' },
  { id: 2, type: 'ROUTE', title: 'Embouteillage majeur', description: 'Accident sur route nationale, retard estimé 2h', date: '2025-12-23T14:00', status: 'OPEN', location: 'RN1 - Entrée Tanger', response: null }
];

const DEMO_NOTIFICATIONS = [
  { id: 1, type: 'MISSION', message: 'Nouvelle mission assignée : Marrakech', date: '2025-12-23T09:00' },
  { id: 2, type: 'INCIDENT', message: 'Réponse à votre incident : Crevaison pneu avant', date: '2025-12-24T11:00' },
  { id: 3, type: 'MAINTENANCE', message: 'Rappel : Entretien du véhicule prévu le 15/01/2026', date: '2025-12-22T08:00' }
];

function kpiCard(label, value, note) {
  return html`<article class="admin-metric">
    <p class="eyebrow">${label}</p>
    <h3>${value}</h3>
    ${note ? html`<p class="field-note">${note}</p>` : ''}
  </article>`;
}

function useDriverCharts(missions) {
  const missionChartRef = useRef(null);
  const planningChartRef = useRef(null);
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
    if (!ChartLib._driverRegistered) {
      var registerables = ChartLib.registerables || [];
      if (registerables.length) ChartLib.register.apply(ChartLib, registerables);
      ChartLib._driverRegistered = true;
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
      return count || Math.floor(Math.random() * 2) + 1;
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
  }, [missions]);

  return { missionChartRef: missionChartRef, planningChartRef: planningChartRef };
}

export function DriverDashboardPage() {
  const routerNavigate = useNavigate();
  const [activeTab, setActiveTab] = useState('vue d’ensemble');
  const [missions, setMissions] = useState(DEMO_MISSIONS);
  const [incidents, setIncidents] = useState(DEMO_INCIDENTS);
  const [notifications, setNotifications] = useState(DEMO_NOTIFICATIONS);
  const [vehicle, setVehicle] = useState(DEMO_DRIVER.vehicle);
  const [status, setStatus] = useState('Données chargées');
  const [actionMessage, setActionMessage] = useState('');
  const [showIncidentForm, setShowIncidentForm] = useState(false);
  const [incidentForm, setIncidentForm] = useState({ type: 'VEHICLE', title: '', description: '', location: '', photo: null });
  const mapRef = useRef(null);
  const mapInst = useRef(null);

  var userEmail = DEMO_DRIVER.email;
  var userLabel = DEMO_DRIVER.fullName;
  var userPhoto = DEMO_DRIVER.photo;

  var chartRefs = useDriverCharts(missions);

  useEffect(function() {
    // TODO: API fetch for missions, incidents, vehicle, notifications
    setStatus('Données chargées');
  }, []);

  useEffect(function() {
    if (activeTab === 'carte' && mapRef.current && !mapInst.current && window.L) {
      var m = window.L.map(mapRef.current).setView([33.57, -7.59], 6);
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(m);
      window.L.circleMarker([33.57, -7.59], { radius: 12, fillColor: '#1cc8ee', color: '#fff', weight: 2, fillOpacity: 0.9 }).addTo(m).bindPopup('Position actuelle - Casablanca');
      missions.forEach(function(mission) {
        var coords = CITIES[mission.destination];
        if (coords) {
          var color = mission.status === 'IN_PROGRESS' ? '#64ed9d' : mission.status === 'COMPLETED' ? '#9d7aff' : '#f2a900';
          window.L.circleMarker(coords, { radius: 8, fillColor: color, color: '#fff', weight: 2, fillOpacity: 0.85 }).addTo(m).bindPopup(mission.destination + ' - ' + (STATUS_LABELS[mission.status] || mission.status));
        }
      });
      incidents.forEach(function(inc) {
        if (inc.location && inc.location.startsWith('Km')) {
          var lat = 33.57 + Math.random() * 0.2 - 0.1;
          var lng = -7.59 + Math.random() * 0.2 - 0.1;
          window.L.circleMarker([lat, lng], { radius: 7, fillColor: '#ff7a88', color: '#fff', weight: 2, fillOpacity: 0.85 }).addTo(m).bindPopup('Incident : ' + inc.title);
        }
      });
      mapInst.current = m;
      setTimeout(function() { m.invalidateSize(); }, 150);
    }
  }, [activeTab, missions, incidents]);

  var pendingCount = missions.filter(function(m) { return m.status === 'PENDING' || m.status === 'ASSIGNED'; }).length;
  var inProgressCount = missions.filter(function(m) { return m.status === 'IN_PROGRESS'; }).length;
  var completedCount = missions.filter(function(m) { return m.status === 'COMPLETED' || m.status === 'DELIVERED'; }).length;
  var openIncidents = incidents.filter(function(i) { return i.status !== 'RESOLVED'; }).length;

  function startMission(id) {
    setMissions(missions.map(function(m) { return m.id === id ? Object.assign({}, m, { status: 'IN_PROGRESS' }) : m; }));
    setActionMessage('Mission démarrée.');
  }

  function completeMission(id) {
    setMissions(missions.map(function(m) { return m.id === id ? Object.assign({}, m, { status: 'COMPLETED' }) : m; }));
    setActionMessage('Mission terminée.');
  }

  function submitIncident(e) {
    e.preventDefault();
    var newIncident = {
      id: Date.now(),
      type: incidentForm.type,
      title: incidentForm.title,
      description: incidentForm.description,
      date: new Date().toISOString(),
      status: 'OPEN',
      location: incidentForm.location,
      response: null
    };
    setIncidents([newIncident].concat(incidents));
    setShowIncidentForm(false);
    setIncidentForm({ type: 'VEHICLE', title: '', description: '', location: '', photo: null });
    setActionMessage('Incident signalé.');
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
          <img src=${userPhoto} alt="photo" style=${{ width: '48px', borderRadius: '50%', margin: '0.5rem 0' }} />
          <strong>${userLabel}</strong>
          <p>${userEmail}</p>
        </div>
        <ul class="admin-sidebar__nav">
          ${driverMenu.map(function(item) {
            var isActive = activeTab === item.toLowerCase();
            return html`<li key=${item}><button class=${isActive ? 'is-active' : ''} onClick=${function() { handleTabClick(item); }}>${item}</button></li>`;
          })}
        </ul>
        <button class="ghost-button" onClick=${handleLogout}>Déconnexion</button>
      </aside>

      <section class="admin-main">
        <header class="admin-topbar">
          <div>
            <p class="eyebrow">Vue Chauffeur</p>
            <h1>Tableau de bord</h1>
            <p class="field-note">Suivez vos missions et incidents.</p>
          </div>
          <div class="admin-topbar__session">
            <p>Session : ${userLabel}</p>
            <p class="field-note">${status}</p>
            <button class="ghost-button" type="button" onClick=${function() { setStatus('Données chargées'); }}>Actualiser</button>
          </div>
        </header>

        ${actionMessage ? html`<div class="inline-banner inline-banner--success">${actionMessage}</div>` : ''}

        ${activeTab === 'vue d’ensemble' ? html`
          <section class="admin-metrics">
            ${kpiCard('Missions à réaliser', pendingCount)}
            ${kpiCard('Missions en cours', inProgressCount)}
            ${kpiCard('Missions terminées', completedCount)}
            ${kpiCard('Incidents signalés', incidents.length, openIncidents + ' ouverts')}
            ${kpiCard('Véhicule', vehicle.licensePlate, vehicle.status === 'ACTIVE' ? 'Actif' : 'Maintenance')}
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
        ` : ''}

        ${activeTab === 'missions' ? html`
          <section class="panel">
            <div class="panel-head">
              <div>
                <p class="eyebrow">Missions</p>
                <h3>Mes missions</h3>
                <p class="field-note">${missions.length} missions</p>
              </div>
            </div>
            <div class="table-wrapper">
              <table>
                <thead><tr><th>Destination</th><th>Description</th><th>Client</th><th>Date prévue</th><th>Statut</th><th>Actions</th></tr></thead>
                <tbody>
                  ${missions.map(function(m) {
                    return html`<tr key=${m.id}>
                      <td>${m.destination || '—'}</td>
                      <td>${m.description || '—'}</td>
                      <td>${m.customerName || '—'}</td>
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

        ${activeTab === 'incidents' ? html`
          <section class="panel">
            <div class="panel-head">
              <div>
                <p class="eyebrow">Incidents</p>
                <h3>Mes signalements</h3>
                <p class="field-note">${incidents.length} incidents</p>
              </div>
              <button class="primary-button" onClick=${function() { setShowIncidentForm(true); }}>+ Signaler un incident</button>
            </div>
            <div class="table-wrapper">
              <table>
                <thead><tr><th>Titre</th><th>Type</th><th>Description</th><th>Date</th><th>Statut</th><th>Réponse</th></tr></thead>
                <tbody>
                  ${incidents.map(function(inc) {
                    return html`<tr key=${inc.id}>
                      <td>${inc.title || '—'}</td>
                      <td><span class="badge badge--neutral">${inc.type || '—'}</span></td>
                      <td>${inc.description || '—'}</td>
                      <td>${inc.date ? new Date(inc.date).toLocaleDateString('fr-FR') : '—'}</td>
                      <td><span class="badge ${inc.status === 'RESOLVED' ? 'badge--success' : 'badge--danger'}">${inc.status === 'RESOLVED' ? 'Résolu' : 'Ouvert'}</span></td>
                      <td>${inc.response || '—'}</td>
                    </tr>`;
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ` : ''}

        ${activeTab === 'véhicule' ? html`
          <section class="panel">
            <div class="panel-head">
              <div>
                <p class="eyebrow">Véhicule</p>
                <h3>Mon véhicule</h3>
                <p class="field-note">${vehicle.licensePlate} - ${vehicle.status === 'ACTIVE' ? 'Actif' : 'Maintenance'}</p>
              </div>
            </div>
            <div class="table-wrapper">
              <table>
                <tbody>
                  <tr><td>Immatriculation</td><td>${vehicle.licensePlate}</td></tr>
                  <tr><td>Marque</td><td>${vehicle.brand}</td></tr>
                  <tr><td>Modèle</td><td>${vehicle.model}</td></tr>
                  <tr><td>Statut</td><td>${vehicle.status === 'ACTIVE' ? 'Actif' : 'Maintenance'}</td></tr>
                  <tr><td>Prochain entretien</td><td>${vehicle.nextMaintenance}</td></tr>
                </tbody>
              </table>
              <h4 style=${{ marginTop: '1.5rem' }}>Incidents récents</h4>
              <ul>
                ${vehicle.recentIncidents.map(function(inc) {
                  return html`<li>${inc.title} (${inc.date}) - <span class="badge ${inc.status === 'RESOLVED' ? 'badge--success' : 'badge--danger'}">${inc.status === 'RESOLVED' ? 'Résolu' : 'Ouvert'}</span></li>`;
                })}
              </ul>
            </div>
          </section>
        ` : ''}

        ${activeTab === 'carte' ? html`
          <section class="admin-card">
            <header>
              <div>
                <p class="eyebrow">Carte</p>
                <h3>Mes missions et incidents</h3>
              </div>
            </header>
            <div ref=${mapRef} style=${{ height: '500px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginTop: '1rem' }}></div>
            <div style=${{ display: 'flex', gap: '1.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
              <span class="badge badge--info">🔵 Position actuelle</span>
              <span class="badge badge--success">🟢 Mission en cours</span>
              <span class="badge badge--warning">🟡 Mission en attente</span>
              <span class="badge badge--neutral">🟣 Mission terminée</span>
              <span class="badge badge--danger">🔴 Incident</span>
            </div>
          </section>
        ` : ''}

        ${activeTab === 'notifications' ? html`
          <section class="panel">
            <div class="panel-head">
              <div>
                <p class="eyebrow">Notifications</p>
                <h3>Mes notifications</h3>
                <p class="field-note">${notifications.length} notifications</p>
              </div>
            </div>
            <ul style=${{ marginTop: '1rem' }}>
              ${notifications.map(function(n) {
                return html`<li style=${{ marginBottom: '1rem' }}><span class="badge badge--info">${n.type}</span> ${n.message} <span class="field-note">${new Date(n.date).toLocaleDateString('fr-FR')}</span></li>`;
              })}
            </ul>
          </section>
        ` : ''}
      </section>

      ${showIncidentForm ? html`
        <div class="modal-overlay" style=${{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick=${function() { setShowIncidentForm(false); }}>
          <div class="admin-card" style=${{ maxWidth: '450px', width: '90%' }} onClick=${function(e) { e.stopPropagation(); }}>
            <header>
              <div>
                <p class="eyebrow">Nouveau</p>
                <h3>Signaler un incident</h3>
              </div>
            </header>
            <form onSubmit=${submitIncident} style=${{ marginTop: '1rem' }}>
              <div class="form-group" style=${{ marginBottom: '1rem' }}>
                <label class="form-label">Type</label>
                <select class="form-select" value=${incidentForm.type} onChange=${function(e) { setIncidentForm(Object.assign({}, incidentForm, { type: e.target.value })); }}>
                  <option value="VEHICLE">Véhicule</option>
                  <option value="ROUTE">Itinéraire</option>
                  <option value="TECHNICAL">Technique</option>
                  <option value="OTHER">Autre</option>
                </select>
              </div>
              <div class="form-group" style=${{ marginBottom: '1rem' }}>
                <label class="form-label">Titre</label>
                <input class="form-control" type="text" required value=${incidentForm.title} onInput=${function(e) { setIncidentForm(Object.assign({}, incidentForm, { title: e.target.value })); }} />
              </div>
              <div class="form-group" style=${{ marginBottom: '1rem' }}>
                <label class="form-label">Description</label>
                <textarea class="form-control" value=${incidentForm.description} onInput=${function(e) { setIncidentForm(Object.assign({}, incidentForm, { description: e.target.value })); }} style=${{ minHeight: '80px' }}></textarea>
              </div>
              <div class="form-group" style=${{ marginBottom: '1rem' }}>
                <label class="form-label">Localisation</label>
                <input class="form-control" type="text" value=${incidentForm.location} onInput=${function(e) { setIncidentForm(Object.assign({}, incidentForm, { location: e.target.value })); }} />
              </div>
              <div class="button-stack" style=${{ display: 'flex', gap: '10px' }}>
                <button class="primary-button" type="submit">Envoyer</button>
                <button class="ghost-button" type="button" onClick=${function() { setShowIncidentForm(false); }}>Annuler</button>
              </div>
            </form>
          </div>
        </div>
      ` : ''}
    </main>
  `;
}
