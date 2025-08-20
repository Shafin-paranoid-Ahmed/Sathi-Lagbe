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

// Load Google Maps API with Places library for autocomplete
const loadGoogleMapsAPI = () => {
  if (!window.google) {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }
};

// Load Google Maps API
loadGoogleMapsAPI();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)