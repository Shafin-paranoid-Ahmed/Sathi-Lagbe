// client/src/App.jsx with improved authentication handling
import { useState, useEffect } from 'react';
import {
  Routes,
  Route,
  Navigate,
  Link
} from 'react-router-dom';

// Auth & general pages
import Signup from './pages/Signup';
import Login from './pages/Login';
import Chat from './pages/Chat';
import Sos from './pages/Sos';

// Ride sharing components
import RideOfferForm from './components/RideOfferForm';
import RideMatchResults from './components/RideMatchResults';
import RideCoordination from './components/RideCoordination';
import MyRides from './components/MyRides';
import RideEditForm from './components/RideEditForm';
import RideDeleteForm from './components/RideDeleteForm';
import FeedbackForm from './components/FeedbackForm';
import FreeRooms from './components/FreeRooms';

// Components
import DarkModeToggle from './components/DarkModeToggle';

// API
import { verifyToken } from './api/auth';

export default function App() {
  const [isDark, setIsDark] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check if user is authenticated on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = sessionStorage.getItem('token');
        
        if (!token) {
          console.log('No token found, user is not authenticated');
          setIsAuthenticated(false);
          setAuthChecked(true);
          setLoading(false);
          return;
        }
        
        console.log('Token found, verifying with server...');
        
        // Verify the token with the server
        await verifyToken();
        
        console.log('Token verified successfully');
        setIsAuthenticated(true);
      } catch (err) {
        console.error('Token verification failed:', err);
        // Don't remove token here - the API interceptor will handle it if needed
        setIsAuthenticated(false);
      } finally {
        setAuthChecked(true);
        setLoading(false);
      }
    };
    
    checkAuth();
  }, []);

  // Toggle 'dark' class on <html>
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center animate-fade-in">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-bracu-blue mx-auto mb-4"></div>
          <p className="text-bracu-gray dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Dark mode toggle */}
      <div className="absolute top-4 right-4 z-50">
        <DarkModeToggle isDark={isDark} setIsDark={setIsDark} />
      </div>

      {/* Navigation Bar (shown when authenticated) */}
      {isAuthenticated && (
        <nav className="bg-white dark:bg-gray-800 shadow-md p-4 sticky top-0 z-40 animate-fade-in">
          <div className="max-w-6xl mx-auto flex flex-wrap justify-between items-center">
            <div className="flex items-center space-x-2">
              <img 
                src="/bracu-logo.svg" 
                alt="BRAC University" 
                className="h-8 w-auto" 
              />
              <div className="text-xl font-bold text-bracu-blue dark:text-blue-400">
                Sathi Lagbe?
              </div>
            </div>
            <div className="flex space-x-2 md:space-x-4">
              <Link to="/chat" className="nav-link">
                Chat
              </Link>
              <Link to="/sos" className="nav-link">
                SOS
              </Link>
              <Link to="/offer" className="nav-link">
                Offer Ride
              </Link>
              <Link to="/search" className="nav-link">
                Find Ride
              </Link>
              <Link to="/myrides" className="nav-link">
                My Rides
              </Link>
              <Link to="/free" className="nav-link">
                Free Rooms
              </Link>
              <button 
                onClick={() => {
                  sessionStorage.removeItem('token');
                  sessionStorage.removeItem('userId');
                  setIsAuthenticated(false);
                  window.location.href = '/login';
                }}
                className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors duration-200"
              >
                Logout
              </button>
            </div>
          </div>
        </nav>
      )}
      
      <main className="p-4 md:p-6 max-w-6xl mx-auto animate-fade-in">
        <Routes>
          {/* Auth Routes */}
          <Route path="/login" element={<Login setIsAuthenticated={setIsAuthenticated} />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/login-success" element={<Navigate to="/chat" replace />} />
          <Route path="/signup-success" element={<Navigate to="/login" replace />} />

          {/* Protected Routes */}
          <Route 
            path="/chat" 
            element={isAuthenticated ? <Chat /> : <Navigate to="/login" replace />} 
          />
          <Route 
            path="/sos" 
            element={isAuthenticated ? <Sos /> : <Navigate to="/login" replace />} 
          />
          
          {/* Ride Sharing Routes */}
          <Route 
            path="/offer" 
            element={isAuthenticated ? <RideOfferForm /> : <Navigate to="/login" replace />} 
          />
          <Route 
            path="/search" 
            element={isAuthenticated ? <RideMatchResults /> : <Navigate to="/login" replace />} 
          />
          <Route 
            path="/rides/:rideId/manage" 
            element={isAuthenticated ? <RideCoordination /> : <Navigate to="/login" replace />} 
          />
          <Route 
            path="/myrides" 
            element={isAuthenticated ? <MyRides /> : <Navigate to="/login" replace />} 
          />
          <Route 
            path="/rides/:rideId/edit" 
            element={isAuthenticated ? <RideEditForm /> : <Navigate to="/login" replace />} 
          />
          <Route 
            path="/rides/:rideId/delete" 
            element={isAuthenticated ? <RideDeleteForm /> : <Navigate to="/login" replace />} 
          />
          <Route 
            path="/rides/:rideId/feedback" 
            element={isAuthenticated ? <FeedbackForm /> : <Navigate to="/login" replace />} 
          />
          <Route 
            path="/free" 
            element={isAuthenticated ? <FreeRooms /> : <Navigate to="/login" replace />} 
          />

          {/* Redirect root to appropriate location */}
          <Route 
            path="/" 
            element={isAuthenticated ? <Navigate to="/chat" replace /> : <Navigate to="/login" replace />} 
          />
          
          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Footer */}
      <footer className="mt-12 py-6 bg-white dark:bg-gray-800 shadow-inner">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-gray-600 dark:text-gray-400">
          <p>© {new Date().getFullYear()} BRAC University Campus Connect</p>
        </div>
      </footer>
    </div>
  );
}