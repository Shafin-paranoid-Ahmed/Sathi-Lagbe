import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { logout, verifyToken, updateStatus, getCurrentUserStatus } from '../api/auth';
import { 
  HomeIcon, 
  ChatBubbleLeftRightIcon, 
  UserGroupIcon, 
  TruckIcon, 
  ExclamationTriangleIcon,
  AcademicCapIcon,
  Bars3Icon,
  XMarkIcon,
  SunIcon,
  MoonIcon,
  ArrowRightOnRectangleIcon,
  UserCircleIcon,
  ChevronDownIcon,
  ClockIcon,
  BookOpenIcon,
  CheckCircleIcon,
  WifiIcon,
  StarIcon
} from '@heroicons/react/24/outline';
import NotificationBell from './NotificationBell';
import socketService from '../services/socketService';
import { MapPinIcon } from '@heroicons/react/24/outline';

const ArgonLayout = ({ children, setIsAuthenticated }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    // Check if dark mode preference is stored for current user
    const currentUserId = sessionStorage.getItem('userId');
    const saved = currentUserId ? localStorage.getItem(`darkMode_${currentUserId}`) : localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [userName, setUserName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [currentStatus, setCurrentStatus] = useState(() => {
    // Initialize from localStorage if available
    const storedStatus = localStorage.getItem('userCurrentStatus');
    return storedStatus || 'available';
  });
  const [statusLoading, setStatusLoading] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const getInitialDropdown = () => {
    const ridesPaths = ['/rides', '/offer', '/search'];
    if (ridesPaths.some(p => location.pathname.startsWith(p))) {
      return 'Rides';
    }
    return '';
  };
  const [openDropdown, setOpenDropdown] = useState(getInitialDropdown);

  const navigation = [
    { name: 'Home', href: '/home', icon: HomeIcon },
    { name: 'Chat', href: '/chat', icon: ChatBubbleLeftRightIcon },
    { name: 'Friends', href: '/friends', icon: UserGroupIcon },
    {
      name: 'Rides',
      icon: TruckIcon,
      children: [
        { name: 'My Rides', href: '/rides' },
        { name: 'Offer a Ride', href: '/offer' },
        { name: 'Find a Ride', href: '/search' },
      ],
    },
    { name: 'SOS', href: '/sos', icon: ExclamationTriangleIcon },
    { name: 'Classrooms', href: '/classrooms', icon: AcademicCapIcon },
    { name: 'Routine', href: '/routine', icon: AcademicCapIcon },
    { name: 'Ratings', href: '/ratings', icon: StarIcon },
  ];

  const statusOptions = [
    { value: 'available', label: 'Available', icon: WifiIcon, color: 'text-green-600' },
    { value: 'busy', label: 'Busy', icon: ClockIcon, color: 'text-red-600' },
    { value: 'in_class', label: 'In Class', icon: BookOpenIcon, color: 'text-blue-600' },
    { value: 'studying', label: 'Studying', icon: BookOpenIcon, color: 'text-purple-600' },
    { value: 'free', label: 'Free', icon: CheckCircleIcon, color: 'text-orange-600' }
  ];

  // Load basic user info and refresh from server
  useEffect(() => {
    const currentUserId = sessionStorage.getItem('userId');
    const name = sessionStorage.getItem('userName') || 'User';
    
    // Use user-specific avatar storage
    const avatar = currentUserId ? sessionStorage.getItem(`userAvatarUrl_${currentUserId}`) || '' : '';
    
    setUserName(name);
    setAvatarUrl(avatar);

    // Best-effort refresh
    (async () => {
      try {
        const res = await verifyToken();
        const n = res.data?.user?.name || name;
        const av = res.data?.user?.avatarUrl || '';
        const userId = res.data?.user?._id || currentUserId;
        
        setUserName(n);
        if (n) sessionStorage.setItem('userName', n);
        if (av && userId) {
          setAvatarUrl(av);
          sessionStorage.setItem(`userAvatarUrl_${userId}`, av);
        }
      } catch (error) {
        // Silent error handling
      }
    })();

    // Fetch current status
    fetchCurrentStatus();
  }, []);

  // Listen for userName changes from Profile component
  useEffect(() => {
    const handleUserNameChange = (event) => {
      const newUserName = event.detail.userName;
      setUserName(newUserName);
    };

    window.addEventListener('userNameChanged', handleUserNameChange);
    
    return () => {
      window.removeEventListener('userNameChanged', handleUserNameChange);
    };
  }, []);

  // Listen for status changes from Profile component
  useEffect(() => {
    const handleStatusChange = (event) => {
      const newStatus = event.detail.status;
      console.log('ArgonLayout: Received userStatusChanged event with status:', newStatus);
      console.log('ArgonLayout: Event detail:', event.detail);
      setCurrentStatus(newStatus);
      // Note: ArgonLayout doesn't need to track isAutoUpdate, but we could add it if needed
    };

    // Listen for localStorage changes (for cross-tab synchronization)
    const handleStorageChange = (event) => {
      if (event.key === 'userCurrentStatus' && event.newValue) {
        setCurrentStatus(event.newValue);
      }
    };

    window.addEventListener('userStatusChanged', handleStatusChange);
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('userStatusChanged', handleStatusChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Ensure socket connection once user is authenticated
  useEffect(() => {
    const token = sessionStorage.getItem('token');
    const userId = sessionStorage.getItem('userId');
    if (token) {
      try {
        socketService.connect(token);
      } catch (e) {
        // Silent error handling
      }
    }
  }, []);



  const fetchCurrentStatus = async () => {
    try {
      const response = await getCurrentUserStatus();
      if (response.data?.status?.current) {
        setCurrentStatus(response.data.status.current);
        // Store in localStorage for persistence
        localStorage.setItem('userCurrentStatus', response.data.status.current);
      }
    } catch (error) {
      // Silent error handling
      // Fallback to localStorage if API fails
      const storedStatus = localStorage.getItem('userCurrentStatus');
      if (storedStatus) {
        setCurrentStatus(storedStatus);
      }
    }
  };

  const handleStatusChange = useCallback(async (newStatus) => {
    if (newStatus === currentStatus || statusLoading) return;
    
    setStatusLoading(true);
    try {
      await updateStatus({ status: newStatus });
      setCurrentStatus(newStatus);
      // Dispatch event to notify other components (like Profile page)
      window.dispatchEvent(new CustomEvent('userStatusChanged', { detail: { status: newStatus } }));
      
      // Store status in localStorage for persistence across page navigation
      localStorage.setItem('userCurrentStatus', newStatus);
      
      // Trigger a custom storage event for same-tab synchronization
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'userCurrentStatus',
        newValue: newStatus,
        oldValue: currentStatus
      }));
    } catch (error) {
      // Silent error handling
    } finally {
      setStatusLoading(false);
    }
  }, [currentStatus, statusLoading]);

  // Add test function for debugging status sync
  useEffect(() => {
    window.testStatusSync = () => {
      const testStatus = currentStatus === 'available' ? 'busy' : 'available';
      handleStatusChange(testStatus);
    };
    
    return () => {
      delete window.testStatusSync;
    };
  }, [currentStatus, handleStatusChange]);

  // Apply dark mode on component mount and when it changes
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Store dark mode preference for current user
    const currentUserId = sessionStorage.getItem('userId');
    if (currentUserId) {
      localStorage.setItem(`darkMode_${currentUserId}`, JSON.stringify(darkMode));
    } else {
      localStorage.setItem('darkMode', JSON.stringify(darkMode));
    }
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      // Silent error handling
    }
    setIsAuthenticated(false);
    navigate('/login');
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Top navbar - Fixed at the top */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <Bars3Icon className="h-6 w-6" />
            </button>
            
            {/* Logo and Brand Name */}
            <Link to="/home" className="flex items-center hover:opacity-80 transition-opacity">
              <img src="/bracu-logo.svg" alt="BRACU Logo" className="h-6 w-6 mr-2" />
              <span className="text-lg font-semibold text-gray-900 dark:text-white">Sathi Lagbe</span>
            </Link>
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors shadow-sm hover:shadow-md"
            >
              {darkMode ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
            </button>

            {/* Notification Bell */}
            <NotificationBell />

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center space-x-2 p-2 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors shadow-sm hover:shadow-md"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="h-6 w-6 rounded-full object-cover" />
                ) : (
                  <UserCircleIcon className="h-5 w-5" />
                )}
                <span className="hidden sm:block text-sm font-medium">{userName}</span>
                <ChevronDownIcon className="h-4 w-4" />
              </button>

              {/* Dropdown Menu */}
              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                  <div className="py-2">
                    <div className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-600">
                      <p className="font-medium">{userName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Signed in</p>
                    </div>
                    
                    {/* Status Section */}
                    <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-600">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">STATUS</p>
                      <div className="flex items-center space-x-2 mb-2">
                        {React.createElement(getStatusIcon(currentStatus), {
                          className: `w-4 h-4 ${getStatusColor(currentStatus)}`
                        })}
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {getStatusLabel(currentStatus)}
                        </span>
                        {statusLoading && (
                          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        {statusOptions.map((option) => {
                          const IconComponent = option.icon;
                          return (
                            <button
                              key={option.value}
                              onClick={() => handleStatusChange(option.value)}
                              disabled={statusLoading || option.value === currentStatus}
                              className={`p-2 rounded text-xs flex items-center space-x-1 transition-colors ${
                                option.value === currentStatus
                                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                                  : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                              } ${statusLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              <IconComponent className={`w-3 h-3 ${option.color}`} />
                              <span>{option.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <Link
                      to="/profile"
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                      onClick={() => setProfileDropdownOpen(false)}
                    >
                      <UserCircleIcon className="h-4 w-4" />
                      <span>Profile</span>
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                    >
                      <ArrowRightOnRectangleIcon className="h-4 w-4" />
                      <span>Sign out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar - Fixed below navbar */}
      <div className={`fixed top-16 left-0 z-40 w-64 h-[calc(100vh-4rem)] bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-300 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0`}>
        <div className="flex flex-col h-full">
          {/* Navigation */}
          <nav className="flex-1 px-3 pt-6 overflow-y-auto">
            <div className="space-y-1">
              {navigation.map((item) => {
                if (item.children) {
                  const isParentActive = item.children.some(child => location.pathname === child.href);
                  const isOpen = openDropdown === item.name;

                  return (
                    <div key={item.name}>
                      <button
                        onClick={() => setOpenDropdown(isOpen ? '' : item.name)}
                        className={`group flex items-center w-full px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                          isParentActive && !isOpen
                            ? 'bg-primary-500 text-white shadow-soft-xl'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                      >
                        <item.icon className="mr-3 h-5 w-5" />
                        <span>{item.name}</span>
                        <ChevronDownIcon
                          className={`ml-auto h-5 w-5 transform transition-transform duration-200 ${
                            isOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                      {isOpen && (
                        <div className="mt-1 pl-6 space-y-1">
                          {item.children.map((child) => {
                            const isChildActive = location.pathname === child.href;
                            return (
                              <Link
                                key={child.name}
                                to={child.href}
                                className={`group flex items-center w-full px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                                  isChildActive
                                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                                }`}
                                onClick={() => setSidebarOpen(false)}
                              >
                                {child.name}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActive
                        ? 'bg-primary-500 text-white shadow-soft-xl'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <item.icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Bottom section */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-center">
              <button
                onClick={handleLogout}
                className="flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 rounded-md transition-colors shadow-sm hover:shadow-md"
              >
                <ArrowRightOnRectangleIcon className="mr-2 h-5 w-5" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content - Starts immediately below navbar */}
      <div className="lg:pl-64">
        <main className="pt-16 min-h-[calc(100vh-4rem)]">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Click outside to close profile dropdown */}
      {profileDropdownOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setProfileDropdownOpen(false)}
        />
      )}
    </div>
  );
};

export default ArgonLayout;