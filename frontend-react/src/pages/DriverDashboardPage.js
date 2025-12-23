import { React } from '../lib/react.js';
import { html } from '../lib/html.js';
import { getEmail } from '../services/session.js';
import { getDriverSnapshot } from '../services/driverDataService.js';

export function DriverDashboardPage() {
  const [snapshot, setSnapshot] = React.useState(null);
  const [status, setStatus] = React.useState('Chargement…');
  const [source, setSource] = React.useState('mock');
  const [filters, setFilters] = React.useState({ alertStatus: 'Toutes', search: '' });
  const [activeSection, setActiveSection] = React.useState('section-mission');

  const formatMad = React.useMemo(
    () => (value) => new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD' }).format(value || 0),
    []
  );

  async function loadData({ preferLive = true, freshSeed = false } = {}) {
    setStatus(preferLive ? 'Connexion aux données…' : 'Rafraîchissement de la simulation…');
    const { snapshot: next, source: src, statusLabel } = await getDriverSnapshot({ preferLive, freshSeed });
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

  const { kpis, tables } = snapshot;
  const payments = tables.payments || [];
  const filteredAlerts = tables.alerts.filter((alert) => {
    const statusOk = filters.alertStatus === 'Toutes' || alert.status === filters.alertStatus;
    const text = `${alert.type}`.toLowerCase();
    return statusOk && (!filters.search || text.includes(filters.search.toLowerCase()));
  });

  const filteredMissions = tables.missions.filter((mission) => {
    const text = `${mission.route} ${mission.status}`.toLowerCase();
    return !filters.search || text.includes(filters.search.toLowerCase());
  });

  function goTo(id) {
    setActiveSection(id);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return html`
    <main class="dashboard-shell">
      <aside class="dashboard-sidebar">
        <div>
          <span class="logo-pill">FleetOS</span>
          <p>Bienvenue, ${getEmail() || 'conducteur'}</p>
        </div>
        <nav class="sidebar-nav">
          <p class="eyebrow">Espace Conducteur</p>
          <ul>
            <li><button class=${`ghost-button ${activeSection === 'section-mission' ? 'is-active' : ''}`} aria-current=${activeSection === 'section-mission' ? 'page' : null} type="button" onClick=${() => goTo('section-mission')}>Mission</button></li>
            <li><button class=${`ghost-button ${activeSection === 'section-alertes' ? 'is-active' : ''}`} aria-current=${activeSection === 'section-alertes' ? 'page' : null} type="button" onClick=${() => goTo('section-alertes')}>Alertes</button></li>
            <li><button class=${`ghost-button ${activeSection === 'section-itinerary' ? 'is-active' : ''}`} aria-current=${activeSection === 'section-itinerary' ? 'page' : null} type="button" onClick=${() => goTo('section-itinerary')}>Itinéraire</button></li>
            <li><button class=${`ghost-button ${activeSection === 'section-history' ? 'is-active' : ''}`} aria-current=${activeSection === 'section-history' ? 'page' : null} type="button" onClick=${() => goTo('section-history')}>Historique</button></li>
            <li><button class=${`ghost-button ${activeSection === 'section-payments' ? 'is-active' : ''}`} aria-current=${activeSection === 'section-payments' ? 'page' : null} type="button" onClick=${() => goTo('section-payments')}>Paiements</button></li>
            <li><button class=${`ghost-button ${activeSection === 'section-profile' ? 'is-active' : ''}`} aria-current=${activeSection === 'section-profile' ? 'page' : null} type="button" onClick=${() => goTo('section-profile')}>Profil</button></li>
          </ul>
        </nav>
        <div class="sidebar-note">
          <p>${status} Source: ${source === 'live' ? 'Données en direct' : 'Démonstration'}</p>
        </div>
      </aside>

      <section class="dashboard-main">
        <header class="dashboard-header">
          <div>
            <p class="eyebrow">Espace Conducteur</p>
            <h1>Espace Conducteur</h1>
            <h2>Parcours et missions</h2>
            <p class="field-note">Vos trajets, alertes et confirmations.</p>
          </div>
          <div class="button-stack" style=${{ display: 'flex', gap: '0.5rem' }}>
            <button class="ghost-button" type="button" onClick=${() => loadData({ preferLive: true, freshSeed: false })}>Actualiser</button>
            <button class="ghost-button" type="button" onClick=${() => loadData({ preferLive: false, freshSeed: true })}>Regénérer la simulation</button>
          </div>
        </header>

        ${status
          ? html`<div class="inline-banner inline-banner--info" role="status">${status} Source: ${source === 'live' ? 'Données en direct' : 'Démonstration'}.</div>`
          : null}

        <div class="kpi-grid section-block" id="section-kpis">
          <article class="kpi-card"><p>Missions du jour</p><h3>${kpis.missionsToday}</h3></article>
          <article class="kpi-card"><p>Alertes à traiter</p><h3>${kpis.unreadAlerts}</h3></article>
          <article class="kpi-card"><p>Km semaine</p><h3>${kpis.kmWeek}</h3></article>
          <article class="kpi-card"><p>Statut</p><h3>${kpis.dutyStatus}</h3></article>
        </div>

        <section class="panel">
          <div class="panel-head">
            <div>
              <p class="eyebrow">Actions</p>
              <h3>Commandes rapides</h3>
            </div>
            <div class="button-stack" style=${{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button class="primary-button" type="button" onClick=${() => setStatus('Mission démarrée (simulation).')}>Démarrer mission</button>
              <button class="ghost-button" type="button" onClick=${() => setStatus('Incident déclaré (simulation).')}>Déclarer incident</button>
              <button class="ghost-button" type="button" onClick=${() => setStatus('Check-in arrivée enregistré (simulation).')}>Check-in arrivée</button>
            </div>
          </div>
        </section>

        <section class="panel section-block" id="section-itinerary">
          <div class="panel-head">
            <div>
              <p class="eyebrow">Ma mission</p>
              <h3>Feuille de route</h3>
            </div>
          </div>
          <div class="table-wrapper">
            ${(() => {
              const mission = filteredMissions[0] || tables.missions[0] || {};
              return html`<table>
                <tbody>
                  <tr><th>Itinéraire</th><td>${mission.route || 'À définir'}</td></tr>
                  <tr><th>Statut</th><td>${mission.status || 'Planifiée'}</td></tr>
                  <tr><th>Prochain arrêt</th><td>${mission.nextStop || '—'}</td></tr>
                  <tr><th>Départ</th><td>${mission.startTime || '08:00'}</td></tr>
                  <tr><th>Jour</th><td>${mission.day || 'Aujourd’hui'}</td></tr>
                </tbody>
              </table>`;
            })()}
          </div>
        </section>

        <section class="panel section-block" id="section-mission">
          <div class="panel-head">
            <div>
              <p class="eyebrow">Missions</p>
              <h3>Prochains trajets</h3>
            </div>
            <div class="panel-actions">
              <input class="form-control" placeholder="Rechercher" value=${filters.search} onInput=${(e) => setFilters({ ...filters, search: e.target.value })} />
              <button class="ghost-button" type="button" onClick=${() => setFilters({ ...filters, search: '' })}>Réinitialiser</button>
            </div>
          </div>
          <div class="table-wrapper">
            <table>
              <thead><tr><th>Itinéraire</th><th>Statut</th><th>Jour</th><th>Prochain arrêt</th><th>Départ</th><th>Action</th></tr></thead>
              <tbody>
                ${filteredMissions.map(
                  (mission) => html`<tr>
                    <td>${mission.route}</td>
                    <td><span class="badge ${mission.status === 'En cours' ? 'badge--success' : 'badge--neutral'}">${mission.status}</span></td>
                    <td>${mission.day}</td>
                    <td>${mission.nextStop}</td>
                    <td>${mission.startTime}</td>
                    <td><button class="ghost-button" type="button">Confirmer</button></td>
                  </tr>`
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section class="panel section-block" id="section-alertes">
          <div class="panel-head">
            <div>
              <p class="eyebrow">Alertes</p>
              <h3>Suivi personnel</h3>
            </div>
            <div class="panel-actions">
              <select class="form-select" value=${filters.alertStatus} onChange=${(e) => setFilters({ ...filters, alertStatus: e.target.value })}>
                ${['Toutes', 'À traiter', 'Suivie', 'Clôturée'].map((value) => html`<option value=${value}>${value}</option>`)}
              </select>
            </div>
          </div>
          <div class="table-wrapper">
            <table>
              <thead><tr><th>Type</th><th>Gravité</th><th>Statut</th><th>Temps écoulé</th></tr></thead>
              <tbody>
                ${filteredAlerts.map(
                  (alert) => html`<tr>
                    <td>${alert.type}</td>
                    <td><span class="badge ${alert.severity === 'Élevée' ? 'badge--warning' : 'badge--neutral'}">${alert.severity}</span></td>
                    <td>${alert.status}</td>
                    <td>${alert.timeAgo}</td>
                  </tr>`
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section class="panel section-block" id="section-history">
          <div class="panel-head">
            <div>
              <p class="eyebrow">Historique</p>
              <h3>Derniers trajets</h3>
            </div>
          </div>
          <div class="table-wrapper">
            <table>
              <thead><tr><th>Itinéraire</th><th>Statut</th><th>Arrêt principal</th></tr></thead>
              <tbody>
                ${tables.missions.slice(0, 4).map(
                  (mission) => html`<tr>
                    <td>${mission.route}</td>
                    <td>${mission.status}</td>
                    <td>${mission.nextStop}</td>
                  </tr>`
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section class="panel section-block" id="section-payments">
          <div class="panel-head">
            <div>
              <p class="eyebrow">Paiements</p>
              <h3>Revenus en MAD</h3>
            </div>
          </div>
          <div class="table-wrapper">
            <table>
              <thead><tr><th>Référence</th><th>Mission</th><th>Montant</th><th>Statut</th><th>Mode</th><th>Date</th></tr></thead>
              <tbody>
                ${payments.map(
                  (payment) => html`<tr>
                    <td>${payment.reference}</td>
                    <td>${payment.mission}</td>
                    <td>${formatMad(payment.amount)}</td>
                    <td><span class="badge ${payment.status === 'Payé' ? 'badge--success' : payment.status === 'En cours' ? 'badge--warning' : 'badge--neutral'}">${payment.status}</span></td>
                    <td>${payment.method}</td>
                    <td>${payment.date}</td>
                  </tr>`
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section class="panel section-block" id="section-profile">
          <div class="panel-head">
            <div>
              <p class="eyebrow">Profil</p>
              <h3>Coordonnées</h3>
            </div>
          </div>
          <div class="table-wrapper">
            <table>
              <tbody>
                <tr><th>Email</th><td>${getEmail() || 'conducteur@example.com'}</td></tr>
                <tr><th>Mode</th><td>${source === 'live' ? 'Données en direct' : 'Démonstration'}</td></tr>
                <tr><th>Session</th><td>Espace Conducteur</td></tr>
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  `;
}
