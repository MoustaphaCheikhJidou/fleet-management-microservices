import { React } from '../lib/react.js';
import { html } from '../lib/html.js';
import { getEmail } from '../services/session.js';
import { getOperatorSnapshot } from '../services/operatorDataService.js';

function ChartBars({ data = [], labelKey = 'label', valueKey = 'value' }) {
  if (!data.length) return html`<p class="chart__empty">Aucune donnée</p>`;
  const max = Math.max(...data.map((item) => item[valueKey] || 0), 1);
  return html`<div class="chart">
    ${data.map((item) => {
      const height = Math.round(((item[valueKey] || 0) / max) * 100);
      return html`<div class="chart__item" style=${{ '--value': `${height}%` }}>
        <span class="chart__value">${item[valueKey]}</span>
        <span class="chart__label">${item[labelKey]}</span>
      </div>`;
    })}
  </div>`;
}

export function OperatorDashboardPage() {
  const [snapshot, setSnapshot] = React.useState(null);
  const [status, setStatus] = React.useState('Chargement…');
  const [source, setSource] = React.useState('mock');
  const [filters, setFilters] = React.useState({ severity: 'Toutes', status: 'Tous', search: '' });
  const [activeSection, setActiveSection] = React.useState('section-cockpit');
  const formatMad = React.useMemo(
    () => (value) => new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD' }).format(value || 0),
    []
  );

  async function loadData({ preferLive = true, freshSeed = false } = {}) {
    setStatus(preferLive ? 'Connexion aux données…' : 'Rafraîchissement de la simulation…');
    const { snapshot: next, source: src, statusLabel } = await getOperatorSnapshot({ preferLive, freshSeed });
    setSnapshot(next);
    setSource(src);
    setStatus(statusLabel || 'Données à jour.');
  }

  React.useEffect(() => {
    loadData({ preferLive: true, freshSeed: false });
  }, []);

  if (!snapshot) {
    return html`<section class="dashboard-main"><p>${status}</p></section>`;
  }

  const { kpis, tables, series } = snapshot;
  const invoices = tables.invoices || [];

  const filteredAlerts = tables.alerts.filter((alert) => {
    const severityOk = filters.severity === 'Toutes' || alert.priority === filters.severity;
    const statusOk = filters.status === 'Tous' || alert.status === filters.status;
    const text = `${alert.vehicle} ${alert.type}`.toLowerCase();
    const searchOk = !filters.search || text.includes(filters.search.toLowerCase());
    return severityOk && statusOk && searchOk;
  });

  const filteredMissions = tables.missions.filter((mission) => {
    const text = `${mission.driver} ${mission.route}`.toLowerCase();
    return !filters.search || text.includes(filters.search.toLowerCase());
  });

  function goTo(id) {
    setActiveSection(id);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function markHandled(alertId) {
    setStatus(`Alerte ${alertId} marquée comme traitée (simulation).`);
  }

  return html`
    <main class="dashboard-shell" data-testid="operator-dashboard">
      <aside class="dashboard-sidebar">
        <div>
          <span class="logo-pill">FleetOS</span>
          <p>Bienvenue, ${getEmail() || 'exploitant'}</p>
        </div>
        <nav class="sidebar-nav">
          <p class="eyebrow">Espace Exploitant</p>
          <ul>
            <li><button class=${`ghost-button ${activeSection === 'section-cockpit' ? 'is-active' : ''}`} aria-current=${activeSection === 'section-cockpit' ? 'page' : null} type="button" onClick=${() => goTo('section-cockpit')}>Cockpit</button></li>
            <li><button class=${`ghost-button ${activeSection === 'section-alerts' ? 'is-active' : ''}`} aria-current=${activeSection === 'section-alerts' ? 'page' : null} type="button" onClick=${() => goTo('section-alerts')}>Alertes</button></li>
            <li><button class=${`ghost-button ${activeSection === 'section-missions' ? 'is-active' : ''}`} aria-current=${activeSection === 'section-missions' ? 'page' : null} type="button" onClick=${() => goTo('section-missions')}>Missions</button></li>
            <li><button class=${`ghost-button ${activeSection === 'section-fleet' ? 'is-active' : ''}`} aria-current=${activeSection === 'section-fleet' ? 'page' : null} type="button" onClick=${() => goTo('section-fleet')}>Flotte</button></li>
            <li><button class=${`ghost-button ${activeSection === 'section-drivers' ? 'is-active' : ''}`} aria-current=${activeSection === 'section-drivers' ? 'page' : null} type="button" onClick=${() => goTo('section-drivers')}>Conducteurs</button></li>
            <li><button class=${`ghost-button ${activeSection === 'section-invoices' ? 'is-active' : ''}`} aria-current=${activeSection === 'section-invoices' ? 'page' : null} type="button" onClick=${() => goTo('section-invoices')}>Factures</button></li>
            <li><button class=${`ghost-button ${activeSection === 'section-settings' ? 'is-active' : ''}`} aria-current=${activeSection === 'section-settings' ? 'page' : null} type="button" onClick=${() => goTo('section-settings')}>Paramètres</button></li>
          </ul>
        </nav>
        <div class="sidebar-note">
          <p>${status} Source: ${source === 'live' ? 'Données en direct' : 'Démonstration'}</p>
        </div>
      </aside>

      <section class="dashboard-main">
        <header class="dashboard-header">
          <div>
            <p class="eyebrow">Espace Exploitant</p>
            <h1>Espace Exploitant</h1>
            <h2>Parc & opérations</h2>
            <p class="field-note">Suivi des véhicules, conducteurs et alertes clés.</p>
          </div>
          <div class="button-stack" style=${{ display: 'flex', gap: '0.5rem' }}>
            <button class="ghost-button" type="button" onClick=${() => loadData({ preferLive: true, freshSeed: false })}>Actualiser</button>
            <button class="ghost-button" type="button" onClick=${() => loadData({ preferLive: false, freshSeed: true })}>Regénérer la simulation</button>
          </div>
        </header>
        ${status
          ? html`<div class="inline-banner inline-banner--info" role="status">${status} Source: ${source === 'live' ? 'Données en direct' : 'Démonstration'}.</div>`
          : null}

        <div id="section-cockpit" class="kpi-grid section-block">
          <article class="kpi-card"><p>Véhicules actifs</p><h3>${kpis.vehiclesActive}</h3></article>
          <article class="kpi-card"><p>Conducteurs en service</p><h3>${kpis.driversActive}</h3></article>
          <article class="kpi-card"><p>Alertes ouvertes</p><h3>${kpis.openAlerts}</h3></article>
          <article class="kpi-card"><p>Missions en cours</p><h3>${kpis.missionsInProgress}</h3></article>
        </div>

        <section class="admin-panels">
          <article class="admin-card">
            <header>
              <div>
                <p class="eyebrow">Alertes</p>
                <h3>Répartition</h3>
              </div>
            </header>
            ${ChartBars({ data: series.alertBreakdown })}
          </article>
          <article class="admin-card">
            <header>
              <div>
                <p class="eyebrow">Missions</p>
                <h3>États en cours</h3>
              </div>
            </header>
            ${ChartBars({ data: series.missionBreakdown })}
          </article>
        </section>

        <section id="section-alerts" class="panel section-block">
          <div class="panel-head">
            <div>
              <p class="eyebrow">Alertes</p>
              <h3>Suivi prioritaire</h3>
            </div>
            <div class="panel-actions">
              <select class="form-select" value=${filters.severity} onChange=${(e) => setFilters({ ...filters, severity: e.target.value })}>
                ${['Toutes', 'Critique', 'Élevée', 'Moyenne'].map((value) => html`<option value=${value}>${value}</option>`)}
              </select>
              <select class="form-select" value=${filters.status} onChange=${(e) => setFilters({ ...filters, status: e.target.value })}>
                ${['Tous', 'Ouverte', 'En cours', 'Clôturée'].map((value) => html`<option value=${value}>${value}</option>`)}
              </select>
              <input class="form-control" placeholder="Rechercher" value=${filters.search} onInput=${(e) => setFilters({ ...filters, search: e.target.value })} />
            </div>
          </div>
          <div class="table-wrapper">
            <table>
              <thead><tr><th>Priorité</th><th>Véhicule</th><th>Type</th><th>Date</th><th>Statut</th></tr></thead>
              <tbody>
                ${filteredAlerts.map(
                  (alert) => html`<tr>
                    <td><span class="badge ${alert.priority === 'Critique' ? 'badge--danger' : alert.priority === 'Élevée' ? 'badge--warning' : 'badge--neutral'}">${alert.priority}</span></td>
                    <td>${alert.vehicle}</td>
                    <td>${alert.type}</td>
                    <td>${alert.date}</td>
                    <td>
                      ${alert.status}
                      <button class="ghost-button" type="button" onClick=${() => markHandled(alert.id)}>Marquer traitée</button>
                    </td>
                  </tr>`
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section id="section-missions" class="panel section-block">
          <div class="panel-head">
            <div>
              <p class="eyebrow">Missions</p>
              <h3>Routes en cours</h3>
            </div>
            <div class="panel-actions">
              <button class="ghost-button" type="button" onClick=${() => setFilters({ ...filters, search: '' })}>Réinitialiser la recherche</button>
            </div>
          </div>
          <div class="table-wrapper">
            <table>
              <thead><tr><th>Conducteur</th><th>Itinéraire</th><th>Statut</th><th>Prochain arrêt</th><th>ETA</th></tr></thead>
              <tbody>
                ${filteredMissions.map(
                  (mission) => html`<tr>
                    <td>${mission.driver}</td>
                    <td>${mission.route}</td>
                    <td><span class="badge ${mission.status === 'En cours' ? 'badge--success' : 'badge--neutral'}">${mission.status}</span></td>
                    <td>${mission.nextStop}</td>
                    <td>${mission.etaMinutes} min</td>
                  </tr>`
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section id="section-fleet" class="panel section-block">
          <div class="panel-head">
            <div>
              <p class="eyebrow">Véhicules</p>
              <h3>Disponibilité</h3>
            </div>
          </div>
          <div class="table-wrapper">
            <table>
              <thead><tr><th>Véhicule</th><th>Ville</th><th>Statut</th><th>Kilométrage</th></tr></thead>
              <tbody>
                ${tables.vehicles.map(
                  (vehicle) => html`<tr>
                    <td>${vehicle.name}</td>
                    <td>${vehicle.city}</td>
                    <td><span class="badge ${vehicle.status === 'En ligne' ? 'badge--success' : 'badge--neutral'}">${vehicle.status}</span></td>
                    <td>${vehicle.mileage.toLocaleString('fr-FR')} km</td>
                  </tr>`
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section id="section-drivers" class="panel section-block">
          <div class="panel-head">
            <div>
              <p class="eyebrow">Conducteurs</p>
              <h3>Présence et statut</h3>
            </div>
          </div>
          <div class="table-wrapper">
            <table>
              <thead><tr><th>Conducteur</th><th>Créneau</th><th>Statut</th><th>Dernier événement</th></tr></thead>
              <tbody>
                ${tables.drivers.map(
                  (driver) => html`<tr>
                    <td>${driver.name}</td>
                    <td>${driver.shift}</td>
                    <td><span class="badge ${driver.status === 'En service' ? 'badge--success' : 'badge--neutral'}">${driver.status}</span></td>
                    <td>${driver.lastEvent}</td>
                  </tr>`
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section id="section-invoices" class="panel section-block">
          <div class="panel-head">
            <div>
              <p class="eyebrow">Factures</p>
              <h3>Flux de facturation (MAD)</h3>
            </div>
          </div>
          <div class="table-wrapper">
            <table>
              <thead><tr><th>Référence</th><th>Client</th><th>Montant</th><th>Statut</th><th>Échéance</th></tr></thead>
              <tbody>
                ${invoices.map(
                  (invoice) => html`<tr>
                    <td>${invoice.reference}</td>
                    <td>${invoice.client}</td>
                    <td>${formatMad(invoice.amount)}</td>
                    <td><span class="badge ${invoice.status === 'Payée' ? 'badge--success' : invoice.status === 'En retard' ? 'badge--danger' : 'badge--warning'}">${invoice.status}</span></td>
                    <td>${invoice.dueDate}</td>
                  </tr>`
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section id="section-settings" class="panel section-block">
          <div class="panel-head">
            <div>
              <p class="eyebrow">Actions rapides</p>
              <h3>Commandes Exploitant</h3>
            </div>
          </div>
          <div class="button-stack" style=${{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            <button class="primary-button" type="button" onClick=${() => setStatus('Mission créée (simulation).')}>Créer une mission</button>
            <button class="ghost-button" type="button" onClick=${() => setStatus('Contact conducteur simulé.')}>Contacter un conducteur</button>
            <button class="ghost-button" type="button" onClick=${() => setStatus('Alerte marquée traitée (simulation).')}>Marquer une alerte traitée</button>
          </div>
        </section>
      </section>
    </main>
  `;
}
