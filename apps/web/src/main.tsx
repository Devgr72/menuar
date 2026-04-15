import React from 'react'
import ReactDOM from 'react-dom/client'
import { ClerkProvider } from '@clerk/react'
import App from './App.tsx'
import './index.css'

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!publishableKey && import.meta.env.MODE !== 'development') {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY')
}

// ── Error Boundary ──────────────────────────────────────────────────────────
interface EBState { error: Error | null }
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, EBState> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center',
          justifyContent: 'center', background: '#07090f', fontFamily: 'monospace',
          padding: '2rem',
        }}>
          <div style={{ maxWidth: 600, color: '#fff' }}>
            <p style={{ color: '#f87171', fontWeight: 'bold', fontSize: 18, marginBottom: 12 }}>
              App failed to load
            </p>
            <pre style={{
              background: '#1a1a2e', padding: '1rem', borderRadius: 8,
              fontSize: 13, color: '#fca5a5', overflowX: 'auto', whiteSpace: 'pre-wrap',
            }}>
              {this.state.error.message}
              {'\n\n'}
              {this.state.error.stack}
            </pre>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ClerkProvider
        publishableKey={publishableKey ?? ""}
        signInUrl="/sign-in"
        signUpUrl="/sign-up"
        signInFallbackRedirectUrl="/"
        signUpFallbackRedirectUrl="/onboarding"
        afterSignOutUrl="/sign-in"
      >
        <App />
      </ClerkProvider>
    </ErrorBoundary>
  </React.StrictMode>
)
