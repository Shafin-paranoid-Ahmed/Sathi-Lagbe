import { useState, useEffect } from 'react';
import axios from 'axios';
import { UserCircleIcon, PencilIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

export default function Profile() {
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    gender: '',
    location: '',
    preferences: { darkMode: false }
  });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const token = sessionStorage.getItem('token');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/auth/verify', {
        headers: { "Authorization": token }
      });
      
      if (response.data.user) {
        setProfile({
          name: response.data.user.name || '',
          email: response.data.user.email || '',
          gender: response.data.user.gender || '',
          location: response.data.user.location || '',
          preferences: response.data.user.preferences || { darkMode: false }
        });
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await axios.put('http://localhost:5000/api/users/profile', 
        {
          name: profile.name,
          location: profile.location,
          gender: profile.gender
        },
        { headers: { "Authorization": token } }
      );

      setSuccess('Profile updated successfully!');
      setIsEditing(false);
      
      if (profile.name) {
        sessionStorage.setItem('userName', profile.name);
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    fetchProfile();
    setIsEditing(false);
    setError('');
    setSuccess('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Profile</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Manage your personal details and privacy preferences.
        </p>
      </div>

      {success && (
        <div className="bg-green-100 dark:bg-green-900 border border-green-400 text-green-700 dark:text-green-100 px-4 py-3 rounded">
          {success}
        </div>
      )}

      {error && (
        <div className="bg-red-100 dark:bg-red-900 border border-red-400 text-red-700 dark:text-red-100 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Personal Information
          </h2>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
            >
              <PencilIcon className="h-4 w-4" />
              <span>Edit</span>
            </button>
          ) : (
            <div className="flex space-x-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center space-x-2 px-4 py-2 bg-success-500 text-white rounded-lg hover:bg-success-600 disabled:opacity-50"
              >
                <CheckIcon className="h-4 w-4" />
                <span>{saving ? 'Saving...' : 'Save'}</span>
              </button>
              <button
                onClick={handleCancel}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              >
                <XMarkIcon className="h-4 w-4" />
                <span>Cancel</span>
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-center space-x-4">
            <div className="h-20 w-20 bg-primary-500 rounded-full flex items-center justify-center">
              <UserCircleIcon className="h-12 w-12 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Profile Picture</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">Coming soon</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Name
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              ) : (
                <p className="text-gray-900 dark:text-white">{profile.name || 'Not set'}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>
              <p className="text-gray-900 dark:text-white">{profile.email}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Email cannot be changed</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Gender
              </label>
              {isEditing ? (
                <select
                  value={profile.gender}
                  onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer-not-to-say">Prefer not to say</option>
                </select>
              ) : (
                <p className="text-gray-900 dark:text-white">{profile.gender || 'Not set'}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Location
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={profile.location}
                  onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                  placeholder="e.g., Dhaka, Bangladesh"
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              ) : (
                <p className="text-gray-900 dark:text-white">{profile.location || 'Not set'}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
