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
  MagnifyingGlassIcon
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
  const [weeklyData] = useState({
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'Rides',
        data: [12, 19, 15, 25, 22, 30, 28],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
      },
    ],
  });

  const [userGrowthData] = useState({
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'New Users',
        data: [65, 78, 90, 105, 125, 150],
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderColor: 'rgb(34, 197, 94)',
        borderWidth: 1,
      },
    ],
  });

  const [recentActivities] = useState([
    {
      id: 1,
      type: 'ride',
      message: 'New ride offer from Gulshan to BRACU',
      time: '2 minutes ago',
      user: 'Ahmed Khan',
    },
    {
      id: 2,
      type: 'chat',
      message: 'New message in BRACU Students group',
      time: '5 minutes ago',
      user: 'Sarah Ahmed',
    },
    {
      id: 3,
      type: 'friend',
      message: 'New friend request from Fatima',
      time: '10 minutes ago',
      user: 'Fatima Rahman',
    },
    {
      id: 4,
      type: 'sos',
      message: 'SOS alert resolved successfully',
      time: '15 minutes ago',
      user: 'System',
    },
  ]);

  const StatCard = ({ title, value, change, icon: Icon, color }) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft-xl p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          {change && (
            <p className={`text-sm ${change.startsWith('+') ? 'text-success-600' : 'text-danger-600'}`}>
              {change} from last month
            </p>
          )}
        </div>
        <div className={`p-3 rounded-full ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );

  const QuickActionCard = ({ title, description, icon: Icon, href, color }) => (
    <Link to={href} className="block">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-soft-2xl transition-all duration-300 hover:-translate-y-1">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
          </div>
          <div className={`p-3 rounded-full ${color} ml-4`}>
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
        case 'sos': return ExclamationTriangleIcon;
        default: return UsersIcon;
      }
    };

    const getColor = (type) => {
      switch (type) {
        case 'ride': return 'text-primary-600 bg-primary-100 dark:bg-primary-900';
        case 'chat': return 'text-info-600 bg-info-100 dark:bg-info-900';
        case 'friend': return 'text-success-600 bg-success-100 dark:bg-success-900';
        case 'sos': return 'text-danger-600 bg-danger-100 dark:bg-danger-900';
        default: return 'text-gray-600 bg-gray-100 dark:bg-gray-700';
      }
    };

    const Icon = getIcon(activity.type);

    return (
      <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
        <div className={`p-2 rounded-full ${getColor(activity.type)}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {activity.message}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {activity.user} • {activity.time}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Welcome Home!</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Here's what's happening with Sathi Lagbe today.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="Total Users"
          value="1,250"
          change="+12%"
          icon={UsersIcon}
          color="bg-primary-500"
        />
        <StatCard
          title="Active Rides"
          value="45"
          change="+8%"
          icon={TruckIcon}
          color="bg-success-500"
        />
        <StatCard
          title="Total Chats"
          value="89"
          change="+15%"
          icon={ChatBubbleLeftRightIcon}
          color="bg-info-500"
        />
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <QuickActionCard
            title="Offer a Ride"
            description="Share your ride with fellow students"
            icon={PlusIcon}
            href="/offer"
            color="bg-primary-500"
          />
          <QuickActionCard
            title="Find a Ride"
            description="Search for available rides"
            icon={MagnifyingGlassIcon}
            href="/search"
            color="bg-success-500"
          />
          <QuickActionCard
            title="Check Classrooms"
            description="Find available study spaces"
            icon={AcademicCapIcon}
            href="/classrooms"
            color="bg-info-500"
          />
        </div>
      </div>

      {/* Charts and Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Ride Activity */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft-xl p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Weekly Ride Activity</h3>
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
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft-xl p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">User Growth</h3>
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
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft-xl p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h3>
        <div className="space-y-2">
          {recentActivities.map((activity) => (
            <ActivityItem key={activity.id} activity={activity} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Home; 