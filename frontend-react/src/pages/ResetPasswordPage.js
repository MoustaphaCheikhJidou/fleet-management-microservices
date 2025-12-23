import { React } from '../lib/react.js';
import { html } from '../lib/html.js';
import { useNavigate, useLocation } from '../router.js';
import { ENDPOINTS } from '../services/config.js';
import { safeFetch } from '../services/api.js';
import { setGuardBanner } from '../services/session.js';

function useQuery() {
  const { search } = useLocation();
  return React.useMemo(() => new URLSearchParams(search), [search]);
}

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const query = useQuery();
  const presetToken = query.get('token') || '';
  const [form, setForm] = React.useState({ token: presetToken, newPassword: '', confirmPassword: '' });
  const [status, setStatus] = React.useState({ tone: '', message: '' });
  const statusTimer = React.useRef(null);

  React.useEffect(() => () => statusTimer.current && window.clearTimeout(statusTimer.current), []);

  function showStatus(tone, message) {
    if (statusTimer.current) window.clearTimeout(statusTimer.current);
    setStatus({ tone, message });
    if (message) {
      statusTimer.current = window.setTimeout(() => setStatus({ tone: '', message: '' }), 5000);
    }
  }

  function updateForm(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (form.newPassword !== form.confirmPassword) {
      showStatus('danger', 'Les mots de passe ne correspondent pas.');
      return;
    }
    showStatus('info', 'Validation en cours…');
    try {
      await safeFetch(ENDPOINTS.resetPassword, {
        method: 'POST',
        body: {
          token: form.token,
          newPassword: form.newPassword,
          confirmPassword: form.confirmPassword,
        },
      });
      setGuardBanner('Mot de passe enregistré. Vous pouvez vous connecter.');
      showStatus('success', 'Mot de passe enregistré. Redirection…');
      window.setTimeout(() => navigate('/login', { replace: true }), 600);
    } catch (error) {
      if (error.status === 400) {
        showStatus('danger', error.payload?.message || 'Lien expiré ou invalide.');
      } else {
        showStatus('danger', 'Impossible de finaliser la demande. Réessayez.');
      }
    }
  }

  return html`
    <section class="auth-shell ui-body">
      <div class="auth-page">
        <div class="auth-hero">
          <p class="eyebrow">Activation sécurisée</p>
          <h1>Définissez votre mot de passe.</h1>
          <p>Le lien provient de l’administrateur. Pour des raisons de sécurité, il est limité dans le temps et utilisable une seule fois.</p>
          <ul class="badge-stack">
            <li>Jeton à usage unique</li>
            <li>Aucune connexion automatique</li>
            <li>Politique de mot de passe renforcée</li>
          </ul>
        </div>
        <div class="auth-card">
          <form class="auth-form" data-testid="reset-form" onSubmit=${handleSubmit}>
            <h2>Activation / Réinitialisation</h2>
            <div class="form-field">
              <label class="form-label" for="reset-token">Lien / jeton</label>
              <input
                id="reset-token"
                class="form-input"
                type="text"
                required
                data-testid="reset-token"
                value=${form.token}
                onInput=${(event) => updateForm('token', event.target.value)}
              />
              <p class="field-note">Coller le paramètre token reçu par email. Le lien reste valable environ 90 minutes.</p>
            </div>
            <div class="form-field">
              <label class="form-label" for="reset-new">Nouveau mot de passe (min 8 caractères)</label>
              <input
                id="reset-new"
                class="form-input"
                type="password"
                required
                minLength="8"
                data-testid="reset-new"
                value=${form.newPassword}
                onInput=${(event) => updateForm('newPassword', event.target.value)}
              />
            </div>
            <div class="form-field">
              <label class="form-label" for="reset-confirm">Confirmer</label>
              <input
                id="reset-confirm"
                class="form-input"
                type="password"
                required
                minLength="8"
                data-testid="reset-confirm"
                value=${form.confirmPassword}
                onInput=${(event) => updateForm('confirmPassword', event.target.value)}
              />
            </div>
            <button class="primary-button form-submit" data-testid="reset-submit" type="submit">Enregistrer</button>
            ${status.message
              ? html`<div class="inline-banner inline-banner--${status.tone || 'info'}" role="status" aria-live="polite" data-testid="reset-status">${status.message}</div>`
              : null}
            <p class="auth-alt">
              Déjà prêt ?
              <button type="button" class="ghost-button--light" onClick=${() => navigate('/login')}>
                Retour à la connexion
              </button>
            </p>
          </form>
        </div>
      </div>
    </section>
  `;
}
