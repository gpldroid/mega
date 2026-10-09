import { ArrowRight, Globe2, ShieldCheck, Smartphone, Workflow } from 'lucide-react';

const adminUrl = './admin/';

export default function PublicApp() {
  return (
    <main className="public-shell">
      <nav className="public-nav">
        <a className="brand" href="./" aria-label="MEGA home"><span className="brand-mark">M</span> MEGA</a>
        <a className="nav-link" href={adminUrl}>Admin sign in <ArrowRight size={16} /></a>
      </nav>
      <section className="hero">
        <div className="eyebrow"><span /> WEBSITE TO ANDROID WORKSPACE</div>
        <h1>From website<br /><span>to Android app.</span></h1>
        <p className="hero-copy">Prepare website projects, manage content, and build Android packages from one controlled workflow.</p>
        <div className="hero-actions">
          <a className="primary-link" href={adminUrl}>Open administration <ArrowRight size={17} /></a>
          <a className="secondary-link" href="https://github.com/gpldroid/mega" target="_blank" rel="noreferrer">View source on GitHub</a>
        </div>
        <div className="hero-note"><ShieldCheck size={16} /> Administration is served on a separate route with authenticated access.</div>
      </section>
      <section className="features" aria-label="Platform features">
        <article><Globe2 /><h2>Website projects</h2><p>Keep website project files and configuration organized independently from the public landing page.</p></article>
        <article><Smartphone /><h2>Android builds</h2><p>Request APK and AAB builds through the GitHub Actions workflow and track build status.</p></article>
        <article><Workflow /><h2>Managed workflow</h2><p>Use Supabase for identity, application data, and access policies.</p></article>
      </section>
      <footer>© {new Date().getFullYear()} MEGA · Website to Android</footer>
    </main>
  );
}
