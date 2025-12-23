import { html } from '../lib/html.js';
import { Navigate } from '../router.js';
import { getSession, getUserLabel, isAdmin, isAuthed, isCarrier, isDriver } from '../services/session.js';
import { OperatorDashboardPage } from './OperatorDashboardPage.js';
import { DriverDashboardPage } from './DriverDashboardPage.js';

export function DashboardPage() {
  const session = getSession();

  if (!isAuthed()) {
    return html`<${Navigate} to="/login" replace=${true} />`;
  }

  if (isAdmin(session)) {
    return html`<${Navigate} to="/admin" replace=${true} />`;
  }

  if (isDriver(session)) {
    return html`<${DriverDashboardPage} />`;
  }

  if (isCarrier(session)) {
    return html`<${OperatorDashboardPage} />`;
  }

  return html`<section class="dashboard-main" style=${{ padding: '2rem' }}>
    <div class="panel" style=${{ maxWidth: '640px', margin: '0 auto' }}>
      <p class="eyebrow">${getUserLabel(session)}</p>
      <h2>Accès indisponible</h2>
      <p class="field-note">Veuillez vous reconnecter pour accéder à votre espace personnalisé.</p>
      <div style=${{ marginTop: '1rem' }}>
        <a class="primary-button" href="/login">Revenir à la connexion</a>
      </div>
    </div>
  </section>`;
}
