// client/src/pages/Signup.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signup } from '../api/auth';

const isBracuEmail = (email) => /^[^@\s]+@(?:g\.)?bracu\.ac\.bd$/i.test(email);

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPass] = useState('');
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [gender, setGender] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (!isBracuEmail(email)) {
        setError('Please use your BRACU G-Suite email');
        setLoading(false);
        return;
      }

      // Include additional user fields that are used in the backend
      await signup({
        email, 
        password,
        name: name || email.split('@')[0], // Use part of email as name if not provided
        location,
        gender
      });
      navigate('/signup-success');
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Signup failed');
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
          Create an Account
        </h2>

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

        <label className="block mb-2 text-gray-700 dark:text-gray-300">
          Name (optional)
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="mt-1 w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white dark:bg-gray-700 dark:border-gray-600"
          />
        </label>

        <label className="block mb-2 text-gray-700 dark:text-gray-300">
          Gender (optional)
          <select
            value={gender}
            onChange={e => setGender(e.target.value)}
            className="mt-1 w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white dark:bg-gray-700 dark:border-gray-600"
          >
            <option value="">Select Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </label>

        <label className="block mb-2 text-gray-700 dark:text-gray-300">
          Location (optional)
          <input
            type="text"
            value={location}
            onChange={e => setLocation(e.target.value)}
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
          className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
        >
          {loading ? 'Signing up…' : 'Sign Up'}
        </button>

        <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-500 hover:underline">
            Log In
          </Link>
        </p>
      </form>
    </div>
  );
}