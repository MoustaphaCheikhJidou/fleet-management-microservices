import { React } from '../lib/react.js';
import { html } from '../lib/html.js';
import {
  getAdminDataset,
  recomputeSnapshotWithAlerts,
  buildEmptySnapshot,
  inviteCarrier,
  inviteDriver,
  inviteAdmin,
} from '../services/adminDataService.js';
import { getEmail, getUserLabel, logout } from '../services/session.js';
import { useNavigate } from '../router.js';
import { safeFetch } from '../services/api.js';
import { ENDPOINTS } from '../services/config.js';

const adminMenu = ['Cockpit', 'Alertes', 'Exploitants', 'Conducteurs', 'Réseau', 'Qualité', 'Paramètres'];
        console.debug('[admin] inviteAdmin failed', error);
        setActionMessage(formatInviteError(error));
const isEmail = (value) => /.+@.+\..+/.test((value || '').trim());
const chartPalette = ['#1cc8ee', '#64ed9d', '#f2a900', '#ff7a88', '#9d7aff', '#6bd5ff'];

function useAdminCharts(series) {
  const dailyRef = React.useRef(null);
  const typeRef = React.useRef(null);
  const chartRefs = React.useRef({});

  React.useEffect(() => () => {
    Object.values(chartRefs.current).forEach((chart) => chart?.destroy?.());
    chartRefs.current = {};
  }, []);

  React.useEffect(() => {
    const ChartLib = window.Chart;
    if (!ChartLib || !ChartLib.register) return;
    if (!ChartLib._adminRegistered) {
      const registerables = ChartLib.registerables || [];
      if (registerables.length) ChartLib.register(...registerables);
      ChartLib._adminRegistered = true;
    }

    const ensureChart = (key, canvas, config) => {
      if (!canvas) return;
      if (chartRefs.current[key]) {
        chartRefs.current[key].data = config.data;
        chartRefs.current[key].options = config.options;
        chartRefs.current[key].update();
      } else {
        chartRefs.current[key] = new ChartLib(canvas.getContext('2d'), config);
      }
      window.__adminCharts = window.__adminCharts || {};
      window.__adminCharts[key] = chartRefs.current[key];
    };

    const alertsByDay = series?.alertsByDay?.length ? series.alertsByDay : zeroDays.map((dayLabel, idx) => ({ dayLabel, total: 0, critical: 0, dayIndex: idx }));
    const labelsDaily = alertsByDay.map((row) => row.dayLabel || 'Jour');
    const totals = alertsByDay.map((row) => Number(row.total) || 0);
    const critical = alertsByDay.map((row) => Number(row.critical) || 0);
    const hasDailyValues = totals.some((v) => v > 0) || critical.some((v) => v > 0);

    ensureChart('daily', dailyRef.current, {
      type: 'bar',
      data: {
        labels: labelsDaily.length ? labelsDaily : ['Aucune donnée (0)'],
        datasets: [
          {
            label: hasDailyValues ? 'Alertes' : 'Aucune donnée (0)',
            data: totals.length ? totals : [0],
            backgroundColor: '#1cc8ee',
            borderRadius: 6,
          },
          {
            label: 'Critiques',
            data: critical.length ? critical : [0],
            backgroundColor: 'rgba(255, 122, 136, 0.55)',
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#f1f5ff' } },
          tooltip: { intersect: false, mode: 'index' },
        },
        scales: {
          x: { ticks: { color: '#f1f5ff' }, grid: { color: 'rgba(255,255,255,0.07)' } },
          y: { beginAtZero: true, ticks: { color: '#f1f5ff' }, grid: { color: 'rgba(255,255,255,0.07)' } },
        },
      },
    });

    const incidentsByType = series?.incidentsByType?.length ? series.incidentsByType : series?.typologies?.length ? series.typologies : [];
    const typeLabels = incidentsByType.length ? incidentsByType.map((row) => row.type || 'Typologie') : ['Aucune donnée (0)'];
    const typeValues = incidentsByType.length ? incidentsByType.map((row) => Number(row.count) || 0) : [0];
    const hasTypeValues = typeValues.some((v) => v > 0);

    ensureChart('type', typeRef.current, {
      type: 'doughnut',
      data: {
        labels: typeLabels,
        datasets: [
          {
            label: hasTypeValues ? 'Incidents' : 'Aucune donnée (0)',
            data: typeValues,
            backgroundColor: chartPalette.slice(0, Math.max(typeLabels.length, 1)),
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: '#f1f5ff' } },
        },
      },
    });
  }, [series]);

  return { dailyRef, typeRef };
}

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

export function AdminDashboardPage() {
  const routerNavigate = useNavigate();
  const initial = React.useMemo(() => buildEmptySnapshot(), []);
  const [snapshot, setSnapshot] = React.useState(() => initial.snapshot);
  const [status, setStatus] = React.useState(initial.statusLabel);
  const [actionMessage, setActionMessage] = React.useState('');
  const [source, setSource] = React.useState(initial.source);
  const initialFilters = React.useMemo(
    () => ({
      severity: 'Toutes',
      status: 'Tous',
      search: '',
      period: '7j',
      carrierCity: 'Toutes',
      fleetRange: 'Toutes',
      driverStatus: 'Tous',
      driverCarrier: 'Tous',
    }),
    []
  );
  const [filters, setFilters] = React.useState(initialFilters);
  const [newCarrier, setNewCarrier] = React.useState({ name: '', city: '', fleetSize: '', contactEmail: '' });
  const [newDriver, setNewDriver] = React.useState({ name: '', email: '', carrierId: '', phone: '' });
  const [newAdmin, setNewAdmin] = React.useState({ name: '', email: '' });

  const formatInviteError = (error) => {
    if (!error) return 'Impossible d’envoyer l’invitation.';
    const statusLabel = error.status ? ` (HTTP ${error.status})` : '';
    const detail = error.payload ? ` : ${error.payload}` : '';
    if (error.status === 403) return `Accès refusé${statusLabel}.`;
    if (error.status === 400) return `Données invalides${statusLabel}${detail}`;
    return `Invitation échouée${statusLabel}${detail}`;
  };

  async function loadDataset({ preferLive = true } = {}) {
    const { snapshot: next, source: nextSource, statusLabel } = await getAdminDataset({ preferLive });
    setSnapshot(next);
    setSource(nextSource);
    setStatus(statusLabel || 'Données disponibles.');
    setActionMessage('');
  }

  React.useEffect(() => {
    loadDataset({ preferLive: true });
  }, []);

  const tables = snapshot?.tables || { carriers: [], drivers: [], alerts: [] };
  const admins = snapshot?.admins || [];
  const users = snapshot?.users || [];
  const series = snapshot?.series || { alertsByDay: [], incidentsByType: [] };
  const kpis = snapshot?.kpis || {
    totalCarriers: 0,
    totalDrivers: 0,
    totalVehicles: 0,
    openAlerts: 0,
    criticalAlerts: 0,
    incidentsToday: 0,
    activeMissions: 0,
    activityRatePct: 0,
  };

  const filteredAlerts = React.useMemo(() => {
    const alerts = tables.alerts || [];
    const periodOk = () => true;
    return alerts.filter((alert) => {
      const severityOk = filters.severity === 'Toutes' || alert.severity === filters.severity;
      const statusOk = filters.status === 'Tous' || alert.status === filters.status;
      const text = `${alert.type} ${alert.carrier} ${alert.driver} ${alert.vehicle}`.toLowerCase();
      const searchOk = !filters.search || text.includes(filters.search.toLowerCase());
      return severityOk && statusOk && searchOk && periodOk(alert);
    });
  }, [tables.alerts, filters]);

  const filteredCarriers = React.useMemo(() => {
    const carriers = tables.carriers || [];
    const bucket = (size) => {
      if (size < 30) return '<30';
      if (size <= 60) return '30-60';
      return '60+';
    };
    return carriers.filter((carrier) => {
      const cityOk = filters.carrierCity === 'Toutes' || carrier.city === filters.carrierCity;
      const rangeOk = filters.fleetRange === 'Toutes' || bucket(carrier.fleetSize) === filters.fleetRange;
      return cityOk && rangeOk;
    });
  }, [tables.carriers, filters]);

  const filteredDrivers = React.useMemo(() => {
    const drivers = tables.drivers || [];
    return drivers.filter((driver) => {
      const statusOk = filters.driverStatus === 'Tous' || driver.status === filters.driverStatus;
      const carrierOk = filters.driverCarrier === 'Tous' || driver.carrier === filters.driverCarrier;
      return statusOk && carrierOk;
    });
  }, [tables.drivers, filters]);

  const carrierCities = React.useMemo(() => {
    const unique = Array.from(new Set((tables.carriers || []).map((c) => c.city || '—')));
    return ['Toutes', ...unique];
  }, [tables.carriers]);

  const driverCarriers = React.useMemo(() => {
    const unique = Array.from(new Set((tables.drivers || []).map((d) => d.carrier || 'Exploitant')));
    return ['Tous', ...unique];
  }, [tables.drivers]);

  const hasData = React.useMemo(() => {
    const carriers = tables.carriers || [];
    const drivers = tables.drivers || [];
    const alerts = tables.alerts || [];
    return Boolean(carriers.length || drivers.length || alerts.length);
  }, [tables]);

  const firstActionableAlert = filteredAlerts[0] || tables?.alerts?.[0] || null;

  function applyAlertChange(alertId, updater, message) {
    if (!alertId) return;
    setSnapshot((prev) => {
      if (!prev) return prev;
      const nextAlerts = (prev.tables.alerts || []).map((alert) => (alert.id === alertId ? updater(alert) : alert));
      return recomputeSnapshotWithAlerts(prev, nextAlerts);
    });
    if (message) {
      setStatus(message);
      setActionMessage(message);
    }
  }

  function updateAlertStatus(alertId, nextStatus) {
    applyAlertChange(alertId, (alert) => ({ ...alert, status: nextStatus }), `Alerte marquée ${nextStatus}.`);
  }

  function markAlertHandled(alertId) {
    applyAlertChange(alertId, (alert) => ({ ...alert, status: 'Traitée' }), 'Alerte marquée traitée.');
  }

  function assignMissionToAlert(alertId) {
    applyAlertChange(
      alertId,
      (alert) => ({ ...alert, status: 'Assignée', assignee: alert.assignee || 'Responsable' }),
      'Alerte assignée.'
    );
  }

  function exportAlertsCsv(list) {
    if (!list?.length) return;
    const headers = ['Type', 'Gravité', 'Véhicule', 'Exploitant', 'Conducteur', 'Statut', 'Date'];
    const rows = list.map((a) => [a.type, a.severity, a.vehicle, a.carrier, a.driver, a.status, a.date]);
    const csv = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'alertes-admin.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setStatus('Export CSV généré.');
  }

  function handleAddCarrier(event) {
    event.preventDefault();
    if (!newCarrier.city.trim()) {
      setActionMessage('Ville obligatoire.');
      return;
    }
    if (!newCarrier.contactEmail.trim() || !isEmail(newCarrier.contactEmail)) {
      setActionMessage('Email contact obligatoire et valide.');
      return;
    }
    const fleetSizeValue = Number(newCarrier.fleetSize);
    if (Number.isNaN(fleetSizeValue) || fleetSizeValue < 0) {
      setActionMessage('Taille de flotte requise (0 ou plus).');
      return;
    }

    inviteCarrier({ email: newCarrier.contactEmail, fullName: newCarrier.name || newCarrier.contactEmail, city: newCarrier.city, fleetSize: fleetSizeValue })
      .then(() => {
        setStatus('Invitation exploitant envoyée.');
        setActionMessage(`Invitation envoyée à ${newCarrier.contactEmail}. Activation requise.`);
        loadDataset({ preferLive: true });
      })
      .catch((error) => {
        console.debug('[admin] inviteCarrier failed', error);
        setActionMessage(formatInviteError(error));
        setStatus('Invitation exploitant échouée.');
      });

    setNewCarrier({ name: '', city: '', fleetSize: '', contactEmail: '' });
  }

  function handleAddDriver(event) {
    event.preventDefault();
    if (!(tables.carriers || []).length) {
      setActionMessage('Ajoutez d’abord un exploitant.');
      return;
    }
    if (!newDriver.carrierId) {
      setActionMessage('Sélectionnez un exploitant.');
      return;
    }
    if (!newDriver.email.trim() || !isEmail(newDriver.email)) {
      setActionMessage('Email conducteur requis et valide.');
      return;
    }
    inviteDriver({ email: newDriver.email, fullName: newDriver.name || newDriver.email, carrierId: newDriver.carrierId, phone: newDriver.phone })
      .then(() => {
        setStatus('Invitation conducteur envoyée.');
        setActionMessage(`Invitation envoyée à ${newDriver.email}. Activation requise.`);
        loadDataset({ preferLive: true });
      })
      .catch((error) => {
        console.debug('[admin] inviteDriver failed', error);
        setActionMessage(formatInviteError(error));
        setStatus('Invitation conducteur échouée.');
      });

    setNewDriver({ name: '', email: '', carrierId: '', phone: '' });
  }

  function handleAddAdmin(event) {
    event.preventDefault();
    if (!newAdmin.email.trim() || !isEmail(newAdmin.email)) {
      setActionMessage('Email administrateur requis et valide.');
      return;
    }
    inviteAdmin({ email: newAdmin.email, fullName: newAdmin.name || newAdmin.email })
      .then(() => {
        setStatus('Invitation administrateur envoyée.');
        setActionMessage(`Invitation envoyée à ${newAdmin.email}. Activation requise.`);
        loadDataset({ preferLive: true });
      })
      .catch((error) => {
        console.debug('[admin] inviteAdmin failed', error);
        setActionMessage(formatInviteError(error));
        setStatus('Invitation administrateur échouée.');
      });
    setNewAdmin({ name: '', email: '' });
  }

  function handleResendInvite(userId) {
    if (!userId) return;
    safeFetch(ENDPOINTS.adminResendInvite(userId), { method: 'POST' })
      .then(() => {
        setActionMessage('Invitation renvoyée.');
        setStatus('Lien d’activation renvoyé.');
        loadDataset({ preferLive: true });
      })
      .catch(() => {
        setActionMessage('Impossible de renvoyer l’invitation.');
      });
  }

  function handleLogout() {
    logout();
    routerNavigate('/login', { replace: true });
  }

    const { dailyRef, typeRef } = useAdminCharts(series);

    const sourceLabel = source === 'live' ? 'Données directes' : 'Aucune donnée initiale';
    const userEmail = getEmail() || 'superadmin@example.com';
    const userLabel = getUserLabel() || 'Responsable plateforme';
    const sessionLabel = userLabel === 'Administrateur' ? 'Responsable plateforme' : userLabel;

    return html`
    <main class="admin-layout">
      <aside class="admin-sidebar">
        <div class="admin-sidebar__brand">
          <span class="logo-pill">FleetOS</span>
            <strong>${userEmail}</strong>
            <p>${sessionLabel}</p>
        </div>
        <ul class="admin-sidebar__nav">
          ${adminMenu.map((item) => html`<li>${item}</li>`)}
        </ul>
        <button class="ghost-button" onClick=${handleLogout}>Déconnexion</button>
      </aside>
      <section class="admin-main">
        <header class="admin-topbar">
          <div>
            <p class="eyebrow">Vue Administrateur</p>
            <h1>Tableau de pilotage</h1>
            <p class="field-note">Etat initial sans données démo. Ajoutez vos exploitants et conducteurs.</p>
          </div>
          <div class="admin-topbar__session">
            <p>Session : ${userEmail} • ${sessionLabel}</p>
            <p class="field-note">${status || 'Prêt.'} Source: ${sourceLabel}.</p>
            <div class="button-stack" style=${{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
              <button class="ghost-button" type="button" onClick=${() => loadDataset({ preferLive: true })}>Actualiser</button>
            </div>
          </div>
        </header>

        ${actionMessage ? html`<div class="inline-banner inline-banner--success" data-testid="admin-invite-banner">${actionMessage}</div>` : ''}

        ${!hasData
            ? html`<div class="empty-state" data-testid="admin-empty-state">
              <h3>Aucune donnée opérationnelle.</h3>
              <p class="field-note">Commencez par créer un exploitant, puis un conducteur.</p>
              <div class="button-stack" style=${{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <a class="primary-button" href="#carrier-form">Créer un exploitant</a>
                <a class="ghost-button" href="#driver-form">Créer un conducteur</a>
              </div>
            </div>`
          : ''}

        <section class="admin-metrics">
          ${kpiCard('Exploitants', kpis.totalCarriers)}
          ${kpiCard('Conducteurs', kpis.totalDrivers, `${kpis.activityRatePct}% actifs`)}
          ${kpiCard('Véhicules', kpis.totalVehicles)}
          ${kpiCard('Missions en cours', kpis.activeMissions)}
          ${kpiCard('Alertes ouvertes', kpis.openAlerts, `${kpis.criticalAlerts} critiques`)}
          ${kpiCard('Incidents du jour', kpis.incidentsToday)}
        </section>

        <section class="admin-panels">
          <article class="admin-card">
            <header>
              <div>
                <p class="eyebrow">Alertes quotidiennes</p>
                <h3>Tendance sur 7 jours</h3>
              </div>
              <button class="ghost-button" type="button" onClick=${() => setFilters(initialFilters)}>Réinitialiser</button>
            </header>
            <div class="chartjs-card" data-testid="admin-daily-chart">
              <canvas ref=${dailyRef} data-testid="admin-daily-canvas"></canvas>
            </div>
          </article>
          <article class="admin-card">
            <header>
              <div>
                <p class="eyebrow">Typologies</p>
                <h3>Incidents actifs</h3>
              </div>
              <div class="button-stack" style=${{ display: 'flex', gap: '8px' }}>
                <button class="ghost-button" type="button" onClick=${() => loadDataset({ preferLive: true })}>Actualiser</button>
              </div>
            </header>
            <div class="chartjs-card" data-testid="admin-type-chart">
              <canvas ref=${typeRef} data-testid="admin-type-canvas"></canvas>
            </div>
          </article>
        </section>

        <section class="panel">
          <div class="panel-head">
            <div>
              <p class="eyebrow">Alertes critiques</p>
              <h3>Suivi en temps réel</h3>
              <p class="field-note">Filtres multi-critères + actions rapides.</p>
            </div>
            <div class="panel-actions panel-actions--wrap">
              <select class="form-select" value=${filters.period} onChange=${(e) => setFilters({ ...filters, period: e.target.value })}>
                ${periodFilters.map((value) => html`<option value=${value}>Fenêtre ${value}</option>`)}
              </select>
              <select class="form-select" value=${filters.severity} onChange=${(e) => setFilters({ ...filters, severity: e.target.value })}>
                ${severityFilters.map((value) => html`<option value=${value}>${value}</option>`)}
              </select>
              <select class="form-select" value=${filters.status} onChange=${(e) => setFilters({ ...filters, status: e.target.value })}>
                ${statusFilters.map((value) => html`<option value=${value}>${value}</option>`)}
              </select>
              <input class="form-control" placeholder="Rechercher" value=${filters.search} onInput=${(e) => setFilters({ ...filters, search: e.target.value })} />
              <div class="button-stack" style=${{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                <button class="ghost-button" type="button" disabled=${!firstActionableAlert} onClick=${() => updateAlertStatus(firstActionableAlert?.id, 'En cours')}>Marquer en cours</button>
                <button class="ghost-button" type="button" disabled=${!firstActionableAlert} onClick=${() => updateAlertStatus(firstActionableAlert?.id, 'Résolue')}>Marquer résolue</button>
                <button class="ghost-button" type="button" disabled=${!firstActionableAlert} onClick=${() => assignMissionToAlert(firstActionableAlert?.id)}>Assigner mission</button>
                <button class="ghost-button" type="button" disabled=${filteredAlerts.length === 0} onClick=${() => exportAlertsCsv(filteredAlerts)}>Export CSV</button>
              </div>
            </div>
          </div>
          ${actionMessage ? html`<div class="inline-banner inline-banner--muted">${actionMessage}</div>` : ''}
          <div class="table-wrapper">
            <table>
              <thead>
                <tr><th>Type</th><th>Gravité</th><th>Véhicule</th><th>Exploitant</th><th>Conducteur</th><th>Statut</th><th>Responsable</th><th>Actions</th></tr>
              </thead>
              <tbody>
                ${filteredAlerts.length
                  ? filteredAlerts.map(
                      (alert) => html`<tr>
                        <td>${alert.type}</td>
                        <td><span class="badge ${alert.severity === 'Critique' ? 'badge--danger' : 'badge--neutral'}">${alert.severity}</span></td>
                        <td>${alert.vehicle}</td>
                        <td>${alert.carrier}</td>
                        <td>${alert.driver}</td>
                        <td>${alert.status}</td>
                        <td>${alert.assignee || '—'}</td>
                        <td>
                          <div class="button-stack" style=${{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            <button
                              class="ghost-button"
                              type="button"
                              data-testid="alert-mark"
                              onClick=${() => markAlertHandled(alert.id)}
                            >
                              Marquer traitée
                            </button>
                            <button
                              class="ghost-button"
                              type="button"
                              data-testid="alert-assign"
                              onClick=${() => assignMissionToAlert(alert.id)}
                            >
                              Assigner
                            </button>
                          </div>
                        </td>
                      </tr>`
                    )
                  : emptyRow(8, 'Aucune alerte pour le moment.')}
              </tbody>
            </table>
          </div>
        </section>

        <section class="panel" id="carrier-form">
          <div class="panel-head">
            <div>
              <p class="eyebrow">Exploitants</p>
              <h3>Invitations exploitants</h3>
            </div>
            <div class="panel-actions panel-actions--wrap">
              <select class="form-select" value=${filters.carrierCity} onChange=${(e) => setFilters({ ...filters, carrierCity: e.target.value })}>
                ${carrierCities.map((city) => html`<option value=${city}>${city === 'Toutes' ? 'Toutes les villes' : city}</option>`)}
              </select>
              <select class="form-select" value=${filters.fleetRange} onChange=${(e) => setFilters({ ...filters, fleetRange: e.target.value })}>
                ${fleetRanges.map((range) => html`<option value=${range}>Flotte ${range}</option>`)}
              </select>
            </div>
          </div>
          <div class="table-wrapper">
            <table>
              <thead><tr><th>Nom</th><th>Ville</th><th>Contact</th><th>Véhicules</th><th>Alertes</th><th>Statut</th><th>Actions</th></tr></thead>
              <tbody>
                ${filteredCarriers.length
                  ? filteredCarriers.map(
                      (carrier) => html`<tr data-testid="carrier-row">
                        <td>${carrier.name}</td>
                        <td>${carrier.city}</td>
                        <td>${carrier.contactEmail || '—'}</td>
                        <td>${carrier.fleetSize}</td>
                        <td>${carrier.openAlerts}</td>
                        <td><span class="badge ${carrier.status === 'Actif' ? 'badge--success' : carrier.status === 'En attente' ? 'badge--warning' : 'badge--neutral'}">${carrier.status}</span></td>
                        <td>
                          ${carrier.status === 'En attente'
                            ? html`<button class="ghost-button" type="button" onClick=${() => handleResendInvite(carrier.id)}>Renvoyer l'invitation</button>`
                            : html`<span class="field-note">—</span>`}
                        </td>
                      </tr>`
                    )
                  : emptyRow(7, 'Aucun exploitant pour le moment. Créez un exploitant pour démarrer.')}
              </tbody>
            </table>
          </div>
          <form class="admin-form" onSubmit=${handleAddCarrier}>
            <h4>Inviter un exploitant</h4>
            <div class="form-grid">
              <input data-testid="carrier-name" class="form-control" required placeholder="Nom de l'exploitant" value=${newCarrier.name} onInput=${(e) => setNewCarrier({ ...newCarrier, name: e.target.value })} />
              <input data-testid="carrier-city" class="form-control" required placeholder="Ville" value=${newCarrier.city} onInput=${(e) => setNewCarrier({ ...newCarrier, city: e.target.value })} />
              <input data-testid="carrier-email" class="form-control" type="email" required placeholder="Email contact" value=${newCarrier.contactEmail} onInput=${(e) => setNewCarrier({ ...newCarrier, contactEmail: e.target.value })} />
              <input data-testid="carrier-fleetSize" class="form-control" type="number" min="0" required placeholder="Taille de flotte (0 si inconnue)" value=${newCarrier.fleetSize} onInput=${(e) => setNewCarrier({ ...newCarrier, fleetSize: e.target.value })} />
            </div>
            <button data-testid="carrier-submit" class="primary-button" type="submit">Envoyer invitation exploitant</button>
          </form>
        </section>

        <section class="panel" id="driver-form">
          <div class="panel-head">
            <div>
              <p class="eyebrow">Conducteurs</p>
              <h3>Invitations conducteurs</h3>
            </div>
            <div class="panel-actions panel-actions--wrap">
              <select class="form-select" value=${filters.driverStatus} onChange=${(e) => setFilters({ ...filters, driverStatus: e.target.value })}>
                ${driverStatuses.map((value) => html`<option value=${value}>${value}</option>`)}
              </select>
              <select class="form-select" value=${filters.driverCarrier} onChange=${(e) => setFilters({ ...filters, driverCarrier: e.target.value })}>
                ${driverCarriers.map((carrier) => html`<option value=${carrier}>${carrier === 'Tous' ? 'Tous les exploitants' : carrier}</option>`)}
              </select>
            </div>
          </div>
          <div class="table-wrapper">
            <table>
              <thead><tr><th>Nom</th><th>Exploitant</th><th>Email</th><th>Téléphone</th><th>Véhicule</th><th>Statut</th><th>Actions</th></tr></thead>
              <tbody>
                ${filteredDrivers.length
                  ? filteredDrivers.map(
                      (driver) => html`<tr data-testid="driver-row">
                        <td>${driver.name}</td>
                        <td>${driver.carrier}</td>
                        <td>${driver.email}</td>
                        <td>${driver.phone || '—'}</td>
                        <td>${driver.vehicle || '—'}</td>
                        <td><span class="badge ${driver.status === 'Actif' ? 'badge--success' : driver.status === 'En attente' ? 'badge--warning' : 'badge--neutral'}">${driver.status}</span></td>
                        <td>
                          ${driver.status === 'En attente'
                            ? html`<button class="ghost-button" type="button" onClick=${() => handleResendInvite(driver.id)}>Renvoyer l'invitation</button>`
                            : html`<span class="field-note">—</span>`}
                        </td>
                      </tr>`
                    )
                  : emptyRow(7, 'Aucun conducteur pour le moment. Ajoutez-en un via le formulaire ci-dessous.')}
              </tbody>
            </table>
          </div>
          <form class="admin-form" onSubmit=${handleAddDriver}>
            <h4>Inviter un conducteur</h4>
            <div class="form-grid">
              <input data-testid="driver-name" class="form-control" required placeholder="Nom du conducteur" value=${newDriver.name} onInput=${(e) => setNewDriver({ ...newDriver, name: e.target.value })} />
              <select data-testid="driver-carrier" class="form-select" required value=${newDriver.carrierId} onChange=${(e) => setNewDriver({ ...newDriver, carrierId: e.target.value })}>
                <option value="">Choisir un exploitant</option>
                ${(tables.carriers || []).map((carrier) => html`<option value=${carrier.id}>${carrier.name}</option>`)}
              </select>
              <input data-testid="driver-email" class="form-control" required type="email" placeholder="Email" value=${newDriver.email} onInput=${(e) => setNewDriver({ ...newDriver, email: e.target.value })} />
              <input data-testid="driver-phone" class="form-control" placeholder="Téléphone" value=${newDriver.phone} onInput=${(e) => setNewDriver({ ...newDriver, phone: e.target.value })} />
              <div class="form-field"><label class="form-label">Statut initial</label><div class="badge badge--warning">En attente</div></div>
            </div>
            <button data-testid="driver-submit" class="primary-button" type="submit" disabled=${!(tables.carriers || []).length}>Envoyer invitation conducteur</button>
              ${!(tables.carriers || []).length
                ? html`<p class="field-note" data-testid="driver-create-blocker-note">Ajoutez d’abord un exploitant pour créer des conducteurs.</p>`
                : ''}
          </form>
        </section>

        <section class="panel" id="users-panel">
          <div class="panel-head">
            <div>
              <p class="eyebrow">Utilisateurs</p>
              <h3>Comptes existants</h3>
            </div>
          </div>
          <div class="table-wrapper">
            <table>
              <thead><tr><th>Email</th><th>Profils</th><th>Statut</th></tr></thead>
              <tbody>
                ${users.length
                  ? users.map(
                      (user) => html`<tr data-testid="user-row"><td>${user.email}</td><td>${(user.profiles || []).join(', ')}</td><td><span class="badge ${user.status === 'Actif' ? 'badge--success' : user.status === 'En attente' ? 'badge--warning' : 'badge--neutral'}">${user.status || 'Actif'}</span></td></tr>`
                    )
                  : emptyRow(3, 'Aucun utilisateur pour le moment. Les invitations créeront les comptes.')}
              </tbody>
            </table>
          </div>
        </section>

        <section class="panel" id="admin-form">
          <div class="panel-head">
            <div>
              <p class="eyebrow">Administrateurs</p>
              <h3>Invitations administrateurs</h3>
            </div>
          </div>
          <div class="table-wrapper">
            <table>
              <thead><tr><th>Email</th><th>Profils</th><th>Statut</th></tr></thead>
              <tbody>
                ${admins.length
                  ? admins.map(
                      (admin) => html`<tr data-testid="admin-row"><td>${admin.email}</td><td>${(admin.profiles || []).join(', ')}</td><td><span class="badge ${admin.status === 'Actif' ? 'badge--success' : 'badge--warning'}">${admin.status || 'Actif'}</span></td></tr>`
                    )
                  : emptyRow(3, 'Aucun administrateur supplémentaire. Invitez-en un si nécessaire.')}
              </tbody>
            </table>
          </div>
          <form class="admin-form" onSubmit=${handleAddAdmin}>
            <h4>Inviter un administrateur</h4>
            <div class="form-grid">
              <input data-testid="admin-name" class="form-control" placeholder="Nom" value=${newAdmin.name} onInput=${(e) => setNewAdmin({ ...newAdmin, name: e.target.value })} />
              <input data-testid="admin-email" class="form-control" type="email" required placeholder="Email" value=${newAdmin.email} onInput=${(e) => setNewAdmin({ ...newAdmin, email: e.target.value })} />
            </div>
            <button data-testid="admin-submit" class="primary-button" type="submit">Envoyer invitation admin</button>
          </form>
        </section>
      </section>
    </main>
  `;
}
