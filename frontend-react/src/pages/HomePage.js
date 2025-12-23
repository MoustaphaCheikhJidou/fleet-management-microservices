import { html } from '../lib/html.js';
import { useNavigate } from '../router.js';

export function HomePage() {
  const navigate = useNavigate();
  return html`
    <main class="site-shell">
      <section class="home-hero">
        <div class="home-hero__media">
          <div class="home-hero__image-frame">
            <img class="home-hero__image" src="/img/car2.jpeg" alt="Flotte de véhicules prêts à partir" loading="lazy" />
            <div class="home-hero__badges">
              <span class="home-hero__badge">Alertes prioritaires</span>
              <span class="home-hero__badge">Missions en cours</span>
              <span class="home-hero__badge">Réseau chauffeurs</span>
            </div>
          </div>
        </div>
        <div class="home-hero__content">
          <div class="brand-cluster">
            <span class="logo-pill">FleetOS</span>
            <div>
              <p class="brand-eyebrow">Pilotage intelligent</p>
              <h1 class="brand-title">Plateforme de gestion de parc automobile</h1>
            </div>
          </div>
          <div class="home-hero__headline">
            <p class="eyebrow">Suivi temps réel</p>
            <h2>Exploitants et conducteurs sur une même interface.</h2>
            <p class="field-note">Visualisez les missions en cours, l’état des véhicules et les alertes critiques sans changer d’outil.</p>
          </div>
          <div class="home-hero__actions">
            <button class="primary-button" onClick=${() => navigate('/login')}>Connexion</button>
            <span class="field-note">Les accès sont créés par l’administrateur.</span>
          </div>
          <div class="home-hero__kpis">
            <div class="kpi-card kpi-card--ghost">
              <p>Véhicules suivis</p>
              <h3>+250</h3>
              <small class="field-note">Statuts mis à jour en continu</small>
            </div>
            <div class="kpi-card kpi-card--ghost">
              <p>Missions actives</p>
              <h3>48</h3>
              <small class="field-note">Trajets surveillés</small>
            </div>
            <div class="kpi-card kpi-card--ghost">
              <p>Alertes résolues</p>
              <h3>93%</h3>
              <small class="field-note">Traitement guidé</small>
            </div>
          </div>
        </div>
      </section>

      <section class="hero-grid hero-grid--secondary">
        <article class="hero-copy">
          <p class="eyebrow">Parcours métiers</p>
          <h2>Exploitant : cockpit flotte — Conducteur : feuille de route.</h2>
          <p>Ouvrez votre espace dédié, suivez vos KPIs et agissez immédiatement sur les missions et alertes.</p>
          <ul class="badge-stack">
            <li>Alertes sécurités</li>
            <li>Missions & trajets</li>
            <li>Réseau chauffeurs</li>
          </ul>
        </article>
        <article class="hero-panel">
          <div class="hero-panel__card hero-panel__card--accent">
            <p class="eyebrow">Visibilité globale</p>
            <h3>KPIs quotidiens</h3>
            <ul>
              <li><span>Véhicules actifs</span><span>214</span></li>
              <li><span>Alertes critiques</span><span>12</span></li>
              <li><span>Conducteurs connectés</span><span>68</span></li>
            </ul>
          </div>
          <div class="hero-panel__card">
            <p class="eyebrow">Sécurité & qualité</p>
            <h3>Alertes contextualisées</h3>
            <p>Chaque événement est relié au véhicule, au conducteur et à la mission concernée pour accélérer la résolution.</p>
          </div>
        </article>
      </section>
    </main>
  `;
}
