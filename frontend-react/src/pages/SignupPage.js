import { React } from '../lib/react.js';
import { html } from '../lib/html.js';
import { ENDPOINTS } from '../services/config.js';
import { safeFetch } from '../services/api.js';
import { useNavigate } from '../router.js';

const roleOptions = [
  { value: 'ROLE_CARRIER', label: 'Exploitant' },
  { value: 'ROLE_DRIVER', label: 'Conducteur' },
];

export function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = React.useState({ email: '', password: '', role: roleOptions[0].value });
  const [status, setStatus] = React.useState({ tone: '', message: '' });
  const statusTimer = React.useRef(null);

  React.useEffect(() => () => statusTimer.current && window.clearTimeout(statusTimer.current), []);

  function showStatus(tone, message) {
    if (statusTimer.current) window.clearTimeout(statusTimer.current);
    setStatus({ tone, message });
    if (message) {
      statusTimer.current = window.setTimeout(() => setStatus({ tone: '', message: '' }), 4000);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    showStatus('info', 'Création en cours…');
    try {
      await safeFetch(ENDPOINTS.signup, {
        method: 'POST',
        body: {
          email: form.email,
          password: form.password,
          roles: [form.role],
        },
      });
      showStatus('success', 'Compte créé. Vous pouvez vous connecter.');
      window.setTimeout(() => navigate('/login'), 800);
    } catch (error) {
      showStatus('danger', 'Impossible de créer le compte. Réessayez.');
    }
  }

  function handleChange(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return html`
    <section class="auth-shell auth-shell--reverse">
      <div class="auth-hero">
        <p class="eyebrow">Ouverture de compte</p>
        <h1>Invitez vos exploitants ou conducteurs.</h1>
        <p>Chaque compte accède uniquement aux tableaux utiles à son métier. Les accès administrateurs sont délivrés par votre référent FleetOS.</p>
      </div>
      <div class="auth-panel">
        <form class="auth-panel__card" onsubmit=${handleSubmit}>
          <h2>Inscription</h2>
          <label class="form-field">
            <span class="form-label">Email professionnel</span>
            <input
              class="form-control"
              type="email"
              required
              value=${form.email}
              oninput=${(event) => handleChange('email', event.target.value)}
            />
          </label>
          <label class="form-field">
            <span class="form-label">Mot de passe</span>
            <input
              class="form-control"
              type="password"
              required
              value=${form.password}
              oninput=${(event) => handleChange('password', event.target.value)}
            />
          </label>
          <label class="form-field">
            <span class="form-label">Profil</span>
            <select
              class="form-select"
              value=${form.role}
              oninput=${(event) => handleChange('role', event.target.value)}
            >
              ${roleOptions.map((option) =>
                html`<option value=${option.value}>${option.label}</option>`
              )}
            </select>
          </label>
          <button class="primary-button" type="submit">Créer le compte</button>
          ${status.message
            ? html`<div class="inline-banner inline-banner--${status.tone || 'info'}" role="status" aria-live="polite">${status.message}</div>`
            : null}
        </form>
      </div>
    </section>
  `;
}
