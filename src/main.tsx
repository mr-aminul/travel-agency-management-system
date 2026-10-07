import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { bootstrapDataBackend } from './bootstrapData'
import { initAppearanceListener } from './lib/brand'
import { initKeyboardFocus } from './lib/keyboardFocus'

/* Login-critical fonts only — shell weights load with AuthenticatedLayout */
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-500.css'
import '@fontsource/plus-jakarta-sans/latin-800.css'

import './index.css'

initAppearanceListener()
initKeyboardFocus()

/**
 * Hydrate the save/load backend before importing stores/App, otherwise
 * module-level store init would bind to localStorage first.
 */
void bootstrapDataBackend()
  .then(async () => {
    const [{ default: App }, { AuthProvider }] = await Promise.all([
      import('./App'),
      import('@/lib/auth'),
    ])
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <AuthProvider>
          <App />
        </AuthProvider>
      </StrictMode>,
    )
  })
  .catch((error) => {
    console.error('[boot] failed', error)
  })
