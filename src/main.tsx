
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

createRoot(document.getElementById("root")!).render(<App />);

// Register service worker and handle updates
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
        
        // Check for updates on page load
        registration.update();
        
        // Check for service worker updates periodically
        setInterval(() => {
          registration.update();
          console.log('Checking for service worker updates...');
        }, 60 * 60 * 1000); // Check every hour
        
        // Handle updates
        registration.onupdatefound = () => {
          const installingWorker = registration.installing;
          if (installingWorker) {
            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  // New update available
                  console.log('New version available! Refreshing...');
                  // Show a notification using the toast system
                  if (window.confirm('A new version is available. Reload now?')) {
                    registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
                    window.location.reload();
                  }
                }
              }
            };
          }
        };
      })
      .catch(error => {
        console.log('ServiceWorker registration failed: ', error);
      });
      
    // Listen for controlling service worker changes
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('Controller changed, reloading...');
      window.location.reload();
    });
  });
}
