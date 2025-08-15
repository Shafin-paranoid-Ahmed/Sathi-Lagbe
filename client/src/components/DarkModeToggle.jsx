// client/src/components/DarkModeToggle.jsx
import { useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';

export default function DarkModeToggle({ isDark, setIsDark }) {
  // Apply or remove 'dark' class on <html>
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    
    // Store theme preference for current user
    const currentUserId = sessionStorage.getItem('userId');
    if (currentUserId) {
      localStorage.setItem(`theme_${currentUserId}`, isDark ? 'dark' : 'light');
    } else {
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
    }
  }, [isDark]);

  return (
    <button
      onClick={() => setIsDark(d => !d)}
      className="
        p-2
        bg-white dark:bg-gray-800
        hover:bg-gray-100 dark:hover:bg-gray-700
        text-bracu-blue dark:text-blue-400
        rounded-full
        shadow-md hover:shadow-lg
        focus:outline-none
        transition-all duration-200
        transform hover:-translate-y-0.5
      "
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? (
        <Sun size={20} className="animate-fade-in" />
      ) : (
        <Moon size={20} className="animate-fade-in" />
      )}
    </button>
  );
}