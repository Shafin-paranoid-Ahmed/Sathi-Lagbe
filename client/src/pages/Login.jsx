// client/src/pages/Login.jsx
import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { login } from '../api/auth';

export default function Login({ setIsAuthenticated }) {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const isExpired = queryParams.get('expired') === 'true';
  
  const [email, setEmail] = useState('');
  const [password, setPass] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await login({ email, password });
      
      // Debug logging
      console.log('Login response:', res.data);
      
      // Store token and user info
      sessionStorage.setItem('token', res.data.token);
      
      // If user ID is returned, store it
      if (res.data.user?._id) {
        sessionStorage.setItem('userId', res.data.user._id);
      } else if (res.data.userId) {
        sessionStorage.setItem('userId', res.data.userId);
      }
      
      // Store user name for profile display
      if (res.data.user?.name) {
        sessionStorage.setItem('userName', res.data.user.name);
      } else if (res.data.user?.email) {
        // Use email as fallback if name is not available
        sessionStorage.setItem('userName', res.data.user.email.split('@')[0]);
      }
      
      // Debug logging
      console.log('Token stored:', sessionStorage.getItem('token'));
      console.log('UserId stored:', sessionStorage.getItem('userId'));
      console.log('UserName stored:', sessionStorage.getItem('userName'));
      
      // Update authentication state
      setIsAuthenticated(true);
      
      // Navigate to success page
      navigate('/chat');
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.message || err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg"
      >
        <h2 className="text-3xl mb-6 text-center font-bold text-gray-800 dark:text-gray-100">
          Log In
        </h2>

        {isExpired && (
          <div className="mb-4 p-3 bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 rounded">
            Your session has expired. Please log in again.
          </div>
        )}

        {error && (
          <div className="mb-4 p-2 bg-red-200 text-red-800 rounded">
            {error}
          </div>
        )}

        <label className="block mb-2 text-gray-700 dark:text-gray-300">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="mt-1 w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white dark:bg-gray-700 dark:border-gray-600"
          />
        </label>

        <label className="block mb-4 text-gray-700 dark:text-gray-300">
          Password
          <input
            type="password"
            required
            value={password}
            onChange={e => setPass(e.target.value)}
            className="mt-1 w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white dark:bg-gray-700 dark:border-gray-600"
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
        >
          {loading ? 'Logging in…' : 'Log In'}
        </button>

        <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
          Don't have an account?{' '}
          <Link to="/signup" className="text-green-500 hover:underline">
            Sign Up
          </Link>
        </p>
      </form>
    </div>
  );
}