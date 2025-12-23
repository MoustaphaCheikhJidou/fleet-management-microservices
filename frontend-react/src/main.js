import { HomePage } from './pages/HomePage.js';
import { LoginPage } from './pages/LoginPage.js';
import { ResetPasswordPage } from './pages/ResetPasswordPage.js';
import { DashboardPage } from './pages/DashboardPage.js';
import { AdminDashboardPage } from './pages/AdminDashboardPage.js';
import {
	BrowserRouter,
	Routes,
	Route,
	Navigate,
	useLocation,
	useNavigate,
} from './router.js';
import { RequireAuth, RequireAdmin } from './router.js';
import { consumeGuardBanner, setGuardBanner } from './services/session.js';

const React = window.React;
const ReactDOMClient = window.ReactDOMClient;
const html = window.htm.bind(React.createElement);

function GuardBanner({ message, onClose }) {
	if (!message) return null;
	return html`<div class="notice-card notice-card--inline" role="alert" data-testid="guard-banner">
		<div>${message}</div>
		<button class="ghost-button" onclick=${onClose}>Fermer</button>
	</div>`;
}

function NotFoundPage() {
	return html`<section class="site-shell">
		<h1>Page introuvable</h1>
		<p>Le lien demandé n’existe plus.</p>
		<button class="primary-button" onclick=${() => window.history.back()}>Retour</button>
	</section>`;
}

function SignupRedirect() {
	const navigate = useNavigate();
	React.useEffect(() => {
		setGuardBanner('Création de compte désactivée — contactez votre administrateur.');
		navigate('/login', { replace: true });
	}, [navigate]);
	return html`<section class="site-shell"><p>Redirection…</p></section>`;
}

function AppLayout() {
	const location = useLocation();
	const [banner, setBanner] = React.useState(consumeGuardBanner());

	React.useEffect(() => {
		const nextMessage = consumeGuardBanner();
		if (!nextMessage) return undefined;
		setBanner(nextMessage);
		const timer = window.setTimeout(() => setBanner(''), 4000);
		return () => window.clearTimeout(timer);
	}, [location.pathname]);

	return html`<div class="app-shell">
		<${GuardBanner} message=${banner} onClose=${() => setBanner('')} />
		<${Routes}>
			<${Route} path="/" element=${html`<${HomePage} />`} />
			<${Route} path="/login" element=${html`<${LoginPage} />`} />
			<${Route} path="/signup" element=${html`<${SignupRedirect} />`} />
			<${Route} path="/reset-password" element=${html`<${ResetPasswordPage} />`} />
			<${Route}
				path="/dashboard"
				element=${html`<${RequireAuth}><${DashboardPage} /></${RequireAuth}>`}
			/>
			<${Route}
				path="/admin"
				element=${html`<${RequireAuth}><${RequireAdmin}><${AdminDashboardPage} /></${RequireAdmin}></${RequireAuth}>`}
			/>
			<${Route} path="*" element=${html`<${NotFoundPage} />`} />
		</${Routes}>
	</div>`;
}

const container = document.getElementById('root');
const root = ReactDOMClient.createRoot(container);
root.render(html`<${BrowserRouter}><${AppLayout} /></${BrowserRouter}>`);
