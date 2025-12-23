import { React } from '../lib/react.js';
import { html } from '../lib/html.js';
import { ENDPOINTS } from '../services/config.js';
import { safeFetch } from '../services/api.js';
import { setSession } from '../services/session.js';
import { useNavigate } from '../router.js';

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
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
    showStatus('info', 'Connexion en cours…');
    try {
      const data = await safeFetch(ENDPOINTS.signin, {
        method: 'POST',
        body: { email, password },
      });
      setSession({ token: data.token, email: data.email, roles: data.roles });
      showStatus('success', 'Connexion réussie. Redirection…');
      const roles = data.roles || [];
      const supported = ['ROLE_ADMIN', 'ROLE_DRIVER', 'ROLE_CARRIER'];
      const hasSupportedRole = roles.some((role) => supported.includes(role));

      if (!hasSupportedRole) {
        showStatus('warning', 'Ce compte n’a pas encore d’espace actif. Contactez un administrateur.');
        return;
      }

      const target = roles.includes('ROLE_ADMIN') ? '/admin' : '/dashboard';
      navigate(target, { replace: true });
    } catch (error) {
      if (error.status === 401) {
        showStatus('danger', 'Email ou mot de passe incorrect.');
      } else if (error.status === 403) {
        const message = error.payload?.message || 'Compte non activé — consultez votre email pour définir votre mot de passe.';
        showStatus('danger', message);
      } else if (error.status === 404) {
        showStatus('warning', 'Espace temporairement indisponible.');
      } else {
        showStatus('danger', 'Erreur réseau. Réessayez.');
      }
    }
  }

  return html`
    <section class="auth-shell ui-body">
      <div class="auth-page">
        <div class="auth-hero">
          <p class="eyebrow">Connexion sécurisée</p>
          <h1>Accès réservé</h1>
          <p>Les comptes sont créés uniquement par un administrateur. Utilisez l'email reçu pour définir votre mot de passe.</p>
          <ul class="badge-stack">
            <li>Accès exploitant</li>
            <li>Accès conducteur</li>
            <li>Gestion administrateur</li>
          </ul>
        </div>
        <div class="auth-card">
          <form class="auth-form" data-testid="login-form" onSubmit=${handleSubmit}>
            <h2>Connexion</h2>
            <div class="form-field">
              <label class="form-label" for="login-email">Email professionnel</label>
              <input
                id="login-email"
                class="form-input"
                type="email"
                required
                data-testid="login-email"
                value=${email}
                onInput=${(event) => setEmail(event.target.value)}
              />
            </div>
            <div class="form-field">
              <label class="form-label" for="login-password">Mot de passe</label>
              <input
                id="login-password"
                class="form-input"
                type="password"
                required
                data-testid="login-password"
                value=${password}
                onInput=${(event) => setPassword(event.target.value)}
              />
            </div>
            <button class="primary-button form-submit" data-testid="login-submit" type="submit">Se connecter</button>
            <button type="button" class="link-button" onClick=${() => navigate('/reset-password')}>
              Mot de passe oublié ?
            </button>
            ${status.message
              ? html`<div class="inline-banner inline-banner--${status.tone || 'info'}" role="status" aria-live="polite" data-testid="login-status">${status.message}</div>`
              : null}
          </form>
        </div>
      </div>
    </section>
  `;
}
