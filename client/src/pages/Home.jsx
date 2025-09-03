import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  UsersIcon, 
  TruckIcon, 
  ChatBubbleLeftRightIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
  AcademicCapIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ClockIcon,
  WifiIcon,
  BookOpenIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import StatusUpdate from '../components/StatusUpdate';
import { getDashboardStats } from '../api/stats';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const Home = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeRides: 0,
    totalChats: 0,
    userGrowth: [],
    weeklyRideActivity: [],
    friendActivities: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch dashboard statistics
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await getDashboardStats();
        setStats(response.data);
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
        setError('Failed to load dashboard statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  // Process weekly ride data for chart
  const weeklyData = {
    labels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    datasets: [
      {
        label: 'Rides',
        data: [0, 0, 0, 0, 0, 0, 0], // Initialize with zeros
        borderColor: 'rgb(147, 51, 234)',
        backgroundColor: 'rgba(147, 51, 234, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  // Update weekly data when stats are loaded
  if (stats.weeklyRideActivity && stats.weeklyRideActivity.length > 0) {
    stats.weeklyRideActivity.forEach(item => {
      const dayIndex = item._id.day; // MongoDB dayOfWeek: 1=Sunday, 2=Monday, etc.
      const chartIndex = dayIndex === 1 ? 0 : dayIndex - 1; // Convert to 0-based index
      if (chartIndex >= 0 && chartIndex < 7) {
        weeklyData.datasets[0].data[chartIndex] = item.count;
      }
    });
  }

  // Process user growth data for chart
  const userGrowthData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'New Users',
        data: [0, 0, 0, 0, 0, 0], // Initialize with zeros
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderColor: 'rgb(34, 197, 94)',
        borderWidth: 1,
      },
    ],
  };

  // Update user growth data when stats are loaded
  if (stats.userGrowth && stats.userGrowth.length > 0) {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    stats.userGrowth.forEach((item, index) => {
      if (index < 6) {
        userGrowthData.datasets[0].data[index] = item.count;
      }
    });
  }

  const StatCard = ({ title, value, change, icon: Icon, color, gradient }) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft-xl p-6 border border-gray-200 dark:border-gray-700 transform transition-all duration-300 hover:scale-105 hover:shadow-soft-2xl animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {loading ? (
              <div className="animate-pulse bg-gray-300 dark:bg-gray-600 h-8 w-16 rounded"></div>
            ) : (
              value.toLocaleString()
            )}
          </p>
          {change && (
            <div className="flex items-center space-x-1">
              {change.startsWith('+') ? (
                <ArrowUpIcon className="h-4 w-4 text-green-500" />
              ) : (
                <ArrowDownIcon className="h-4 w-4 text-red-500" />
              )}
              <p className={`text-sm font-medium ${change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                {change} from last month
              </p>
            </div>
          )}
        </div>
        <div className={`p-4 rounded-full ${gradient || color} shadow-lg transform transition-all duration-300 hover:scale-110`}>
          <Icon className="h-7 w-7 text-white" />
        </div>
      </div>
    </div>
  );

  const QuickActionCard = ({ title, description, icon: Icon, href, color, gradient }) => (
    <Link to={href} className="block group">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-soft-2xl transition-all duration-300 hover:-translate-y-2 transform animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{title}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
          </div>
          <div className={`p-4 rounded-full ${gradient || color} ml-4 shadow-lg transform transition-all duration-300 group-hover:scale-110 group-hover:rotate-3`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
      </div>
    </Link>
  );

  const ActivityItem = ({ activity }) => {
    const getIcon = (type) => {
      switch (type) {
        case 'ride': return TruckIcon;
        case 'chat': return ChatBubbleLeftRightIcon;
        case 'friend': return UserGroupIcon;
        case 'status': return WifiIcon;
        case 'notification': return ExclamationTriangleIcon;
        case 'sos': return ExclamationTriangleIcon;
        default: return UsersIcon;
      }
    };

    const getColor = (type) => {
      switch (type) {
        case 'ride': return 'text-purple-600 bg-purple-100 dark:bg-purple-900';
        case 'chat': return 'text-blue-600 bg-blue-100 dark:bg-blue-900';
        case 'friend': return 'text-green-600 bg-green-100 dark:bg-green-900';
        case 'status': return 'text-orange-600 bg-orange-100 dark:bg-orange-900';
        case 'notification': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900';
        case 'sos': return 'text-red-600 bg-red-100 dark:bg-red-900';
        default: return 'text-gray-600 bg-gray-100 dark:bg-gray-700';
      }
    };

    const Icon = getIcon(activity.type);

    return (
      <div className="flex items-center space-x-3 p-4 rounded-lg hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-900/20 dark:hover:to-indigo-900/20 transition-all duration-200 transform hover:scale-[1.02] group">
        <div className="flex-shrink-0">
          {activity.userAvatar ? (
            <img 
              src={activity.userAvatar} 
              alt={activity.user} 
              className="h-10 w-10 rounded-full object-cover border-2 border-white dark:border-gray-700 shadow-sm"
            />
          ) : (
            <div className={`p-2 rounded-full ${getColor(activity.type)} shadow-sm`}>
              <Icon className="h-5 w-5" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {activity.message}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {activity.user} • {activity.time}
          </p>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Welcome Home!</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Loading your dashboard...
          </p>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Welcome Home!</h1>
          <p className="text-red-600 dark:text-red-400">
            {error}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8 animate-fade-in">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Welcome Home!</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Here's what's happening with Sathi Lagbe today.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          change="+12%"
          icon={UsersIcon}
          gradient="bg-gradient-to-r from-purple-500 to-indigo-600"
        />
        <StatCard
          title="Active Rides"
          value={stats.activeRides}
          change="+8%"
          icon={TruckIcon}
          gradient="bg-gradient-to-r from-green-500 to-emerald-600"
        />
        <StatCard
          title="Total Chats"
          value={stats.totalChats}
          change="+15%"
          icon={ChatBubbleLeftRightIcon}
          gradient="bg-gradient-to-r from-blue-500 to-cyan-600"
        />
      </div>

      {/* Quick Actions */}
      <div className="mb-8 animate-fade-in">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
          <span className="text-2xl mr-2">⚡</span>
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <QuickActionCard
            title="Offer a Ride"
            description="Share your ride with fellow students"
            icon={PlusIcon}
            href="/offer"
            gradient="bg-gradient-to-r from-purple-500 to-pink-600"
          />
          <QuickActionCard
            title="Find a Ride"
            description="Search for available rides"
            icon={MagnifyingGlassIcon}
            href="/search"
            gradient="bg-gradient-to-r from-green-500 to-teal-600"
          />
          <QuickActionCard
            title="Check Classrooms"
            description="Find available study spaces"
            icon={AcademicCapIcon}
            href="/classrooms"
            gradient="bg-gradient-to-r from-blue-500 to-indigo-600"
          />
        </div>
      </div>

      {/* Status Update Section */}
      <div className="mb-8 animate-fade-in">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
          <span className="text-2xl mr-2">📊</span>
          Update Your Status
        </h2>
        <StatusUpdate />
      </div>

      {/* Charts and Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Ride Activity */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft-xl p-6 border border-gray-200 dark:border-gray-700 transform transition-all duration-300 hover:scale-[1.02] hover:shadow-soft-2xl animate-fade-in">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <TruckIcon className="h-5 w-5 mr-2 text-purple-500" />
            Weekly Ride Activity
          </h3>
          <div className="h-64">
            <Line 
              data={weeklyData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false,
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    grid: {
                      color: 'rgba(156, 163, 175, 0.1)',
                    },
                    ticks: {
                      color: '#6B7280',
                    },
                  },
                  x: {
                    grid: {
                      color: 'rgba(156, 163, 175, 0.1)',
                    },
                    ticks: {
                      color: '#6B7280',
                    },
                  },
                },
              }}
            />
          </div>
        </div>

        {/* User Growth */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft-xl p-6 border border-gray-200 dark:border-gray-700 transform transition-all duration-300 hover:scale-[1.02] hover:shadow-soft-2xl animate-fade-in">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <UsersIcon className="h-5 w-5 mr-2 text-green-500" />
            User Growth
          </h3>
          <div className="h-64">
            <Bar 
              data={userGrowthData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false,
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    grid: {
                      color: 'rgba(156, 163, 175, 0.1)',
                    },
                    ticks: {
                      color: '#6B7280',
                    },
                  },
                  x: {
                    grid: {
                      color: 'rgba(156, 163, 175, 0.1)',
                    },
                    ticks: {
                      color: '#6B7280',
                    },
                  },
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft-xl p-6 border border-gray-200 dark:border-gray-700 transform transition-all duration-300 hover:scale-[1.01] hover:shadow-soft-2xl animate-fade-in">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
          <UserGroupIcon className="h-5 w-5 mr-2 text-orange-500" />
          Friend Activities
        </h3>
        <div className="space-y-1">
          {stats.friendActivities && stats.friendActivities.length > 0 ? (
            stats.friendActivities.map((activity) => (
              <ActivityItem key={activity.id} activity={activity} />
            ))
          ) : (
            <div className="text-center py-8">
              <div className="bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-900/20 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <UserGroupIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  No recent friend activities to show
                </p>
                <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                  Add some friends to see their activities here
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home; 