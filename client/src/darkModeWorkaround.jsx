// client/src/darkModeWorkaround.jsx

// Function to apply dark mode to the DOM directly based on user preference
export function applyDarkMode() {
  const isDarkMode = 
    localStorage.getItem('theme') === 'dark' || 
    (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  if (isDarkMode) {
    document.documentElement.classList.add('dark');
    document.body.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
    document.body.classList.remove('dark');
  }
  
  // Force style recalculation to prevent FOUC (Flash of Unstyled Content)
  document.body.offsetHeight;
  
  console.log('Dark mode applied:', isDarkMode);
}

// Function to toggle dark mode manually
export function toggleDarkMode() {
  const isDarkMode = document.documentElement.classList.contains('dark');
  const newMode = !isDarkMode;
  
  if (newMode) {
    document.documentElement.classList.add('dark');
    document.body.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  } else {
    document.documentElement.classList.remove('dark');
    document.body.classList.remove('dark');
    localStorage.setItem('theme', 'light');
  }
  
  // Force style recalculation
  document.body.offsetHeight;
  
  return newMode;
}

// Initialize on import if we're in a browser environment
if (typeof window !== 'undefined') {
  // Apply on import
  applyDarkMode();
  
  // Watch for system preference changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyDarkMode);
}