import React from 'react';
import { createRoot, type ErrorInfo, type ReactNode } from 'react-dom/client';
import App from './App';
import './styles.css';

type BoundaryState = { error: Error | null };

class AppErrorBoundary extends React.Component<{ children: ReactNode }, BoundaryState> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('MEGA application render failure:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <main style={{ minHeight: '100vh', padding: '32px 20px', background: '#080b14', color: '#f4f5fb', fontFamily: 'system-ui,sans-serif' }}>
          <section style={{ maxWidth: 720, margin: '8vh auto', padding: 24, border: '1px solid #30374b', borderRadius: 20, background: '#101625' }}>
            <p style={{ color: '#c4b5fd', fontWeight: 700, letterSpacing: 2 }}>MEGA · RECOVERY</p>
            <h1 style={{ fontSize: 28, margin: '12px 0' }}>The app could not start</h1>
            <p style={{ color: '#b7bfd3', lineHeight: 1.6 }}>The page loaded, but the application encountered a runtime error. This recovery screen prevents a blank page and shows the diagnostic message.</p>
            <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', padding: 14, borderRadius: 12, background: '#080b14', color: '#fecaca', fontSize: 13 }}>{this.state.error.message || 'Unknown runtime error'}</pre>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 18 }}>
              <button onClick={() => window.location.reload()} style={{ border: 0, borderRadius: 10, padding: '11px 16px', background: '#a99bff', color: '#151027', fontWeight: 700 }}>Reload application</button>
              <a href="https://github.com/gpldroid/mega/actions" style={{ padding: '11px 0', color: '#c4b5fd' }}>Open deployment logs</a>
            </div>
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  document.body.innerHTML = '<main style="font-family:system-ui;padding:32px;background:#080b14;color:white;min-height:100vh"><h1>MEGA startup error</h1><p>The HTML root element (#root) is missing. Check index.html in the deployment.</p></main>';
} else {
  try {
    createRoot(rootElement).render(
      <React.StrictMode>
        <AppErrorBoundary>
          <App />
        </AppErrorBoundary>
      </React.StrictMode>
    );
  } catch (error) {
    console.error('MEGA startup failure:', error);
    rootElement.innerHTML = '<main style="font-family:system-ui;padding:32px;background:#080b14;color:white;min-height:100vh"><h1>MEGA startup error</h1><p>React could not initialize. Reload the page and inspect the browser console.</p></main>';
  }
}
