// client/src/App.jsx with Argon Dashboard integration
import { useState, useEffect } from 'react';
import {
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';

// Auth & general pages
import Signup from './pages/Signup';
import Login from './pages/Login';
import Home from './pages/Home';
import Chat from './pages/Chat';
import Sos from './pages/Sos';
import Friends from './pages/Friends';
import Classroom from './pages/Classroom';
import Routine from './pages/Routine'; // Import Routine page
import Profile from './pages/Profile'; // Import Profile page

// Ride sharing components
import RideOfferForm from './components/RideOfferForm';
import RideMatchResults from './components/RideMatchResults';
import RideCoordination from './components/RideCoordination';
import MyRides from './components/MyRides';
import RideEditForm from './components/RideEditForm';
import RideDeleteForm from './components/RideDeleteForm';
import FeedbackForm from './components/FeedbackForm';
import FreeRooms from './components/FreeRooms';

// Layout
import ArgonLayout from './components/ArgonLayout';

// API
import { verifyToken } from './api/auth';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check if user is authenticated on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = sessionStorage.getItem('token');
        
        if (!token) {
          console.log('No token found, user is not authenticated');
          setIsAuthenticated(false);
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
        setLoading(false);
      }
    };
    
    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center animate-fade-in">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading Sathi Lagbe...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <Routes>
        {/* Auth Routes */}
        <Route path="/login" element={<Login setIsAuthenticated={setIsAuthenticated} />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login-success" element={<Navigate to="/home" replace />} />
        <Route path="/signup-success" element={<Navigate to="/login" replace />} />

        {/* Protected Routes with Argon Layout */}
        <Route 
          path="/home" 
          element={
            isAuthenticated ? (
              <ArgonLayout setIsAuthenticated={setIsAuthenticated}>
                <Home />
              </ArgonLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
        <Route 
          path="/chat" 
          element={
            isAuthenticated ? (
              <ArgonLayout setIsAuthenticated={setIsAuthenticated}>
                <Chat />
              </ArgonLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
        <Route 
          path="/friends" 
          element={
            isAuthenticated ? (
              <ArgonLayout setIsAuthenticated={setIsAuthenticated}>
                <Friends />
              </ArgonLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
        <Route 
          path="/sos" 
          element={
            isAuthenticated ? (
              <ArgonLayout setIsAuthenticated={setIsAuthenticated}>
                <Sos />
              </ArgonLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
        <Route 
          path="/classrooms" 
          element={
            isAuthenticated ? (
              <ArgonLayout setIsAuthenticated={setIsAuthenticated}>
                <Classroom />
              </ArgonLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
        <Route 
          path="/routine" 
          element={
            isAuthenticated ? (
              <ArgonLayout setIsAuthenticated={setIsAuthenticated}>
                <Routine />
              </ArgonLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
        <Route 
          path="/profile" 
          element={
            isAuthenticated ? (
              <ArgonLayout setIsAuthenticated={setIsAuthenticated}>
                <Profile />
              </ArgonLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
        
        {/* Ride Sharing Routes */}
        <Route 
          path="/rides" 
          element={
            isAuthenticated ? (
              <ArgonLayout setIsAuthenticated={setIsAuthenticated}>
                <MyRides />
              </ArgonLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
        <Route 
          path="/offer" 
          element={
            isAuthenticated ? (
              <ArgonLayout setIsAuthenticated={setIsAuthenticated}>
                <RideOfferForm />
              </ArgonLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
        <Route 
          path="/search" 
          element={
            isAuthenticated ? (
              <ArgonLayout setIsAuthenticated={setIsAuthenticated}>
                <RideMatchResults />
              </ArgonLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
        <Route 
          path="/rides/:rideId/manage" 
          element={
            isAuthenticated ? (
              <ArgonLayout setIsAuthenticated={setIsAuthenticated}>
                <RideCoordination />
              </ArgonLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
        <Route 
          path="/rides/:rideId/edit" 
          element={
            isAuthenticated ? (
              <ArgonLayout setIsAuthenticated={setIsAuthenticated}>
                <RideEditForm />
              </ArgonLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
        <Route 
          path="/rides/:rideId/delete" 
          element={
            isAuthenticated ? (
              <ArgonLayout setIsAuthenticated={setIsAuthenticated}>
                <RideDeleteForm />
              </ArgonLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
        <Route 
          path="/rides/:rideId/feedback" 
          element={
            isAuthenticated ? (
              <ArgonLayout setIsAuthenticated={setIsAuthenticated}>
                <FeedbackForm />
              </ArgonLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
        <Route 
          path="/free" 
          element={
            isAuthenticated ? (
              <ArgonLayout setIsAuthenticated={setIsAuthenticated}>
                <FreeRooms />
              </ArgonLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />

        {/* Redirect root to appropriate location */}
        <Route 
          path="/" 
          element={isAuthenticated ? <Navigate to="/home" replace /> : <Navigate to="/login" replace />} 
        />
        
        {/* Catch all route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
