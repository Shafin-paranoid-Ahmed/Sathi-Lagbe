import React, { useEffect, useState } from 'react';
import { CheckIcon, PencilIcon, UserCircleIcon, XMarkIcon, ClockIcon, BookOpenIcon, CheckCircleIcon, WifiIcon, EyeIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { deleteAccount, logout, verifyToken, API, updateStatus, getCurrentUserStatus, updateSettings } from '../api/auth';

export default function Profile() {
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    gender: '',
    location: '',
    phone: '+880',
    preferences: { darkMode: false },
    bracuId: '',
    routineSharingEnabled: true
  });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [avatarPreview, setAvatarPreview] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [currentStatus, setCurrentStatus] = useState('available');
  const [statusLoading, setStatusLoading] = useState(false);
  const navigate = useNavigate();

  const statusOptions = [
    { value: 'available', label: 'Available', icon: WifiIcon, color: 'text-green-600' },
    { value: 'busy', label: 'Busy', icon: ClockIcon, color: 'text-red-600' },
    { value: 'in_class', label: 'In Class', icon: BookOpenIcon, color: 'text-blue-600' },
    { value: 'studying', label: 'Studying', icon: BookOpenIcon, color: 'text-purple-600' },
    { value: 'free', label: 'Free', icon: CheckCircleIcon, color: 'text-orange-600' }
  ];

  useEffect(() => {
    fetchProfile();
    fetchCurrentStatus();
  }, []);

  const fetchProfile = async () => {
    try {
      // Use shared API + interceptor which already attaches the token
      const response = await verifyToken();
      
      if (response.data.user) {
        const currentUser = response.data.user;
        const currentUserId = currentUser._id;
        
        setProfile({
          name: currentUser.name || '',
          email: currentUser.email || '',
          gender: currentUser.gender || '',
          location: currentUser.location || '',
          phone: currentUser.phone || '+880',
          bracuId: currentUser.bracuId || '',
          preferences: currentUser.preferences || { darkMode: false },
          routineSharingEnabled: currentUser.routineSharingEnabled ?? true
        });
        
        // Use user-specific avatar storage
        const userAvatarUrl = sessionStorage.getItem(`userAvatarUrl_${currentUserId}`) || currentUser.avatarUrl || '';
        setAvatarPreview(userAvatarUrl);
        
        // Update session storage with user-specific key
        if (currentUser.avatarUrl) {
          sessionStorage.setItem(`userAvatarUrl_${currentUserId}`, currentUser.avatarUrl);
        }
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentStatus = async () => {
    try {
      const response = await getCurrentUserStatus();
      if (response.data?.status?.current) {
        setCurrentStatus(response.data.status.current);
      }
    } catch (error) {
      console.error('Error fetching status:', error);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (newStatus === currentStatus || statusLoading) return;
    
    setStatusLoading(true);
    try {
      await updateStatus({ status: newStatus });
      setCurrentStatus(newStatus);
      setSuccess('Status updated successfully!');
    } catch (error) {
      console.error('Error updating status:', error);
      setError('Failed to update status');
    } finally {
      setStatusLoading(false);
    }
  };
  
  const handleSettingsChange = async (e) => {
      const { name, checked } = e.target;
      setProfile(prev => ({ ...prev, [name]: checked }));

      try {
          await updateSettings({ [name]: checked });
          setSuccess('Settings updated successfully!');
      } catch (err) {
          setError(err.response?.data?.error || 'Failed to update settings');
          // Revert on error
          setProfile(prev => ({ ...prev, [name]: !checked }));
      }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await API.put('/users/profile', {
        name: profile.name,
        location: profile.location,
        gender: profile.gender,
        phone: profile.phone,
        bracuId: profile.bracuId
      });

      setSuccess('Profile updated successfully!');
      setIsEditing(false);
      
      if (profile.name) {
        sessionStorage.setItem('userName', profile.name);
      }
      
      // Dispatch custom event to notify other components about the name change
      window.dispatchEvent(new CustomEvent('userNameChanged', { 
        detail: { userName: profile.name } 
      }));
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Get current user ID for validation
    const currentUserId = sessionStorage.getItem('userId');
    if (!currentUserId) {
      setError('User session not found. Please login again.');
      return;
    }
    
    setError('');
    setSuccess('');
    setAvatarUploading(true);
    const url = URL.createObjectURL(file);
    setAvatarPreview(url);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      formData.append('userId', currentUserId); // Add user ID for server validation
      
      const res = await API.post('/users/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const updatedUrl = res.data?.user?.avatarUrl;
      if (updatedUrl) {
        setAvatarPreview(updatedUrl);
        
        // Update session storage with user-specific key
        sessionStorage.setItem(`userAvatarUrl_${currentUserId}`, updatedUrl);
        
        // Update profile state
        setProfile(prev => ({
          ...prev,
          avatarUrl: updatedUrl
        }));
      }
      setSuccess('Profile picture updated');
    } catch (err) {
      console.error('Avatar upload error:', err);
      setError(err.response?.data?.error || 'Failed to upload profile picture');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleCancel = () => {
    fetchProfile();
    setIsEditing(false);
    setError('');
    setSuccess('');
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('Are you sure you want to delete your account? This cannot be undone.')) {
      return;
    }
    try {
      await deleteAccount();
      await logout();
      navigate('/signup');
    } catch (err) {
      console.error('Account deletion error:', err);
      setError(err.response?.data?.error || 'Failed to delete account');
    }
  };

  const getStatusIcon = (statusValue) => {
    const option = statusOptions.find(opt => opt.value === statusValue);
    return option ? option.icon : WifiIcon;
  };

  const getStatusColor = (statusValue) => {
    const option = statusOptions.find(opt => opt.value === statusValue);
    return option ? option.color : 'text-gray-600';
  };

  const getStatusLabel = (statusValue) => {
    const option = statusOptions.find(opt => opt.value === statusValue);
    return option ? option.label : 'Available';
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
            <div className="h-20 w-20 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <UserCircleIcon className="h-12 w-12 text-gray-400" />
              )}
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Profile Picture</p>
              <label className="inline-flex items-center px-3 py-2 bg-primary-500 text-white rounded-lg cursor-pointer hover:bg-primary-600">
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                {avatarUploading ? 'Uploading...' : 'Change Photo'}
              </label>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                BRACU ID
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={profile.bracuId}
                  onChange={(e) => setProfile({ ...profile, bracuId: e.target.value })}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              ) : (
                <p className="text-gray-900 dark:text-white">{profile.bracuId || 'Not set'}</p>
              )}
            </div>
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
                Phone (Bangladesh)
              </label>
              {isEditing ? (
                <input
                  type="tel"
                  value={profile.phone}
                  onChange={e => {
                    let v = e.target.value.replace(/[^+\d]/g, '');
                    if (!v.startsWith('+880')) v = '+880' + v.replace(/^\+?880?/, '');
                    const after = v.slice(4).replace(/\D/g, '').slice(0, 10);
                    setProfile({ ...profile, phone: '+880' + after });
                  }}
                  maxLength={14}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              ) : (
                <p className="text-gray-900 dark:text-white">{profile.phone || '+880'}</p>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400">Digits remaining: {Math.max(0, 10 - Math.max(0, (profile.phone?.length || 4) - 4))}</p>
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

      {/* Status Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Status
          </h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Current Status
            </label>
            <div className="flex items-center space-x-2 mb-4">
              {React.createElement(getStatusIcon(currentStatus), {
                className: `w-5 h-5 ${getStatusColor(currentStatus)}`
              })}
              <span className="text-lg font-medium text-gray-900 dark:text-white">
                {getStatusLabel(currentStatus)}
              </span>
              {statusLoading && (
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Change Status
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {statusOptions.map((option) => {
                const IconComponent = option.icon;
                return (
                  <button
                    key={option.value}
                    onClick={() => handleStatusChange(option.value)}
                    disabled={statusLoading || option.value === currentStatus}
                    className={`p-3 rounded-lg border-2 transition-colors flex items-center space-x-2 ${
                      option.value === currentStatus
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                    } ${statusLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <IconComponent className={`w-4 h-4 ${option.color}`} />
                    <span className="text-sm font-medium">{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

        {/* Privacy Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft-xl p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Privacy
            </h2>
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">Share Routine with Friends</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Allow friends to see your free slots in their routine view.
                    </p>
                </div>
                <button
                    type="button"
                    name="routineSharingEnabled"
                    onClick={() => handleSettingsChange({ target: { name: 'routineSharingEnabled', checked: !profile.routineSharingEnabled } })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                        profile.routineSharingEnabled ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                >
                    <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            profile.routineSharingEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                    />
                </button>
            </div>
        </div>

      <div className="text-right">
        <button
          onClick={handleDeleteAccount}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Delete Account
        </button>
      </div>
    </div>
  );
}