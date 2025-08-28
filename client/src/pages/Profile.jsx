import React, { useEffect, useState } from 'react';
import { CheckIcon, PencilIcon, UserCircleIcon, XMarkIcon, ClockIcon, BookOpenIcon, CheckCircleIcon, WifiIcon, EyeIcon, CogIcon } from '@heroicons/react/24/outline';
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
  const [isAutoUpdate, setIsAutoUpdate] = useState(false); // New state for the toggle
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
        
        const userAvatarUrl = sessionStorage.getItem(`userAvatarUrl_${currentUserId}`) || currentUser.avatarUrl || '';
        setAvatarPreview(userAvatarUrl);
        
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
      if (response.data?.status) {
        setCurrentStatus(response.data.status.current);
        setIsAutoUpdate(response.data.status.isAutoUpdate || false); // Fetch auto-update preference
      }
    } catch (error) {
      console.error('Error fetching status:', error);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (newStatus === currentStatus || statusLoading || isAutoUpdate) return;
    
    setStatusLoading(true);
    try {
      // Pass the current isAutoUpdate preference along with the new status
      await updateStatus({ status: newStatus, isAutoUpdate });
      setCurrentStatus(newStatus);
      setSuccess('Status updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error updating status:', error);
      setError('Failed to update status');
    } finally {
      setStatusLoading(false);
    }
  };

  const handleAutoUpdateToggle = async () => {
    const newAutoUpdateState = !isAutoUpdate;
    setIsAutoUpdate(newAutoUpdateState);
    setStatusLoading(true);

    try {
      // Send the new auto-update state while keeping the current status
      await updateStatus({ status: currentStatus, isAutoUpdate: newAutoUpdateState });
      setSuccess(`Automatic status updates ${newAutoUpdateState ? 'enabled' : 'disabled'}.`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
        console.error('Error toggling auto-update:', error);
        setError('Failed to change setting');
        setIsAutoUpdate(!newAutoUpdateState); // Revert on failure
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
          setTimeout(() => setSuccess(''), 3000);
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
      
      window.dispatchEvent(new CustomEvent('userNameChanged', { 
        detail: { userName: profile.name } 
      }));
      setTimeout(() => setSuccess(''), 3000);
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
      formData.append('userId', currentUserId);
      
      const res = await API.post('/users/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const updatedUrl = res.data?.user?.avatarUrl;
      if (updatedUrl) {
        setAvatarPreview(updatedUrl);
        sessionStorage.setItem(`userAvatarUrl_${currentUserId}`, updatedUrl);
        setProfile(prev => ({ ...prev, avatarUrl: updatedUrl }));
      }
      setSuccess('Profile picture updated');
      setTimeout(() => setSuccess(''), 3000);
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
      {/* ... (rest of the component is the same until the Status Section) ... */}
        
      {/* Status Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft-xl p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Status
        </h2>

        {/* Auto-update Toggle */}
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 mb-6">
            <div>
                <h3 className="font-medium text-gray-900 dark:text-white flex items-center">
                    <CogIcon className="w-5 h-5 mr-2" />
                    Automatic Status (Beta)
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    Automatically set your status based on your class routine.
                </p>
            </div>
            <button
                type="button"
                onClick={handleAutoUpdateToggle}
                disabled={statusLoading}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                    isAutoUpdate ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
            >
                <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        isAutoUpdate ? 'translate-x-6' : 'translate-x-1'
                    }`}
                />
            </button>
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
              {isAutoUpdate ? 'Manual Override (disabled)' : 'Change Status'}
            </label>
            {isAutoUpdate && (
                <p className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 p-2 rounded-md mb-2">
                    Your status is being updated automatically. Disable the toggle above to change it manually.
                </p>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {statusOptions.map((option) => {
                const IconComponent = option.icon;
                return (
                  <button
                    key={option.value}
                    onClick={() => handleStatusChange(option.value)}
                    disabled={statusLoading || option.value === currentStatus || isAutoUpdate}
                    className={`p-3 rounded-lg border-2 transition-colors flex items-center space-x-2 ${
                      option.value === currentStatus
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                    } ${statusLoading || isAutoUpdate ? 'opacity-50 cursor-not-allowed' : ''}`}
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
      
      {/* ... (rest of the component is the same) ... */}
    </div>
  );
}