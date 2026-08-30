import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from '@/App'
import { LedgerProvider } from '@/state/store'
import { ProvenanceProvider } from '@/components/ui/Provenance'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Hash routing so the built app works from a file path or a static host
        without any server-side rewrite rules. */}
    <HashRouter>
      <LedgerProvider>
        <ProvenanceProvider>
          <App />
        </ProvenanceProvider>
      </LedgerProvider>
    </HashRouter>
  </StrictMode>,
)
