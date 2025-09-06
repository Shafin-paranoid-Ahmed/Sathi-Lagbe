// client/src/App.jsx with Argon Dashboard integration
import { useState, useEffect, Suspense, lazy } from 'react';
import {
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';

// Auth & general pages - lazy loaded for better performance
const Signup = lazy(() => import('./pages/Signup'));
const Login = lazy(() => import('./pages/Login'));
const Home = lazy(() => import('./pages/Home'));
const Chat = lazy(() => import('./pages/Chat'));
const Sos = lazy(() => import('./pages/SOS'));
const Friends = lazy(() => import('./pages/Friends'));
const Classroom = lazy(() => import('./pages/Classroom'));
const Routine = lazy(() => import('./pages/Routine'));
const Profile = lazy(() => import('./pages/Profile'));
const Ratings = lazy(() => import('./pages/Ratings'));

// Ride sharing components - lazy loaded
const RideOfferForm = lazy(() => import('./components/RideOfferForm'));
const RideMatchResults = lazy(() => import('./components/RideMatchResults'));
const RideCoordination = lazy(() => import('./components/RideCoordination'));
const MyRides = lazy(() => import('./components/MyRides'));
const RideEditForm = lazy(() => import('./components/RideEditForm'));
const RideDeleteForm = lazy(() => import('./components/RideDeleteForm'));
const FeedbackForm = lazy(() => import('./components/FeedbackForm'));
const FreeRooms = lazy(() => import('./components/FreeRooms'));

// Layout - keep this loaded immediately as it's always needed
import ArgonLayout from './components/ArgonLayout';

// API
import { verifyToken } from './api/auth';

// Loading component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
    <div className="text-center animate-fade-in">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
      <p className="text-gray-600 dark:text-gray-300">Loading...</p>
    </div>
  </div>
);

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check if user is authenticated on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = sessionStorage.getItem('token');
        
        if (!token) {
          setIsAuthenticated(false);
          setLoading(false);
          return;
        }
        
        // Verify the token with the server
        await verifyToken();
        
        setIsAuthenticated(true);
      } catch (err) {
        // Don't remove token here - the API interceptor will handle it if needed
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, []);

  // Global event listener for status sync
  useEffect(() => {
    const handleGlobalStatusEvent = (event) => {
      // Global status event handler - can be used for analytics or debugging if needed
    };

    window.addEventListener('userStatusChanged', handleGlobalStatusEvent);
    
    return () => {
      window.removeEventListener('userStatusChanged', handleGlobalStatusEvent);
    };
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
      <Suspense fallback={<LoadingSpinner />}>
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
          path="/classroom" 
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
        <Route 
          path="/ratings" 
          element={
            isAuthenticated ? (
              <ArgonLayout setIsAuthenticated={setIsAuthenticated}>
                <Ratings />
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
      </Suspense>
    </div>
  );
}
