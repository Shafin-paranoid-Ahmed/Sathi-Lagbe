// client/src/main.jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
// Import our custom animations
import './assets/animations.css'
// Import the debug styles if needed during development
// import './debug-styles.css'
// Import dark mode workaround
import { applyDarkMode } from './darkModeWorkaround'
import App from './App.jsx'

// Apply dark mode before rendering
applyDarkMode();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)