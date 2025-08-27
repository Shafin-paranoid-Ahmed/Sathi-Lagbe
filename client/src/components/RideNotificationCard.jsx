import React from 'react';
import { 
  FaCar, 
  FaTimes, 
  FaClock, 
  FaCheck, 
  FaFlag, 
  FaMapMarkerAlt,
  FaCalendarAlt 
} from 'react-icons/fa';

const RideNotificationCard = ({ notification, onAction, onDismiss }) => {
  const getNotificationIcon = () => {
    switch (notification.type) {
      case 'ride_invitation':
        return <FaCar className="text-blue-500" />;
      case 'ride_cancellation':
        return <FaTimes className="text-red-500" />;
      case 'eta_change':
        return <FaClock className="text-yellow-500" />;
      case 'ride_confirmation':
        return <FaCheck className="text-green-500" />;
      case 'ride_completion':
        return <FaFlag className="text-purple-500" />;
      default:
        return <FaCar className="text-gray-500" />;
    }
  };

  const getNotificationColor = () => {
    switch (notification.type) {
      case 'ride_invitation':
        return 'border-l-blue-500 bg-blue-50';
      case 'ride_cancellation':
        return 'border-l-red-500 bg-red-50';
      case 'eta_change':
        return 'border-l-yellow-500 bg-yellow-50';
      case 'ride_confirmation':
        return 'border-l-green-500 bg-green-50';
      case 'ride_completion':
        return 'border-l-purple-500 bg-purple-50';
      default:
        return 'border-l-gray-500 bg-gray-50';
    }
  };

  const getActionButtons = () => {
    const { type, data } = notification;
    
    switch (type) {
      case 'ride_invitation':
        return (
          <div className="flex space-x-2 mt-3">
            <button
              onClick={() => onAction('accept', data.rideId)}
              className="px-3 py-1 bg-green-500 text-white rounded-md text-sm hover:bg-green-600 transition-colors"
            >
              Accept
            </button>
            <button
              onClick={() => onAction('decline', data.rideId)}
              className="px-3 py-1 bg-red-500 text-white rounded-md text-sm hover:bg-red-600 transition-colors"
            >
              Decline
            </button>
          </div>
        );
      
      case 'eta_change':
        return (
          <div className="flex space-x-2 mt-3">
            <button
              onClick={() => onAction('view', data.rideId)}
              className="px-3 py-1 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600 transition-colors"
            >
              View Details
            </button>
          </div>
        );
      
      case 'ride_cancellation':
        return (
          <div className="flex space-x-2 mt-3">
            <button
              onClick={() => onAction('find_alternative', data.rideId)}
              className="px-3 py-1 bg-orange-500 text-white rounded-md text-sm hover:bg-orange-600 transition-colors"
            >
              Find Alternative
            </button>
          </div>
        );
      
      default:
        return (
          <div className="flex space-x-2 mt-3">
            <button
              onClick={() => onAction('view', data.rideId)}
              className="px-3 py-1 bg-gray-500 text-white rounded-md text-sm hover:bg-gray-600 transition-colors"
            >
              View Details
            </button>
          </div>
        );
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={`border-l-4 p-4 rounded-r-lg shadow-sm ${getNotificationColor()} ${!notification.isRead ? 'ring-2 ring-blue-200' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <div className="flex-shrink-0 mt-1">
            {getNotificationIcon()}
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-gray-900">
              {notification.title}
            </h4>
            <p className="text-sm text-gray-600 mt-1">
              {notification.message}
            </p>
            
            {notification.data && (
              <div className="mt-2 space-y-1">
                {notification.data.startLocation && notification.data.endLocation && (
                  <div className="flex items-center text-xs text-gray-500">
                    <FaMapMarkerAlt className="mr-1" />
                    <span>{notification.data.startLocation} → {notification.data.endLocation}</span>
                  </div>
                )}
                
                {notification.data.departureTime && (
                  <div className="flex items-center text-xs text-gray-500">
                    <FaCalendarAlt className="mr-1" />
                    <span>{formatDate(notification.data.departureTime)}</span>
                  </div>
                )}
                
                {notification.data.newEta && (
                  <div className="flex items-center text-xs text-yellow-600 font-medium">
                    <FaClock className="mr-1" />
                    <span>New ETA: {notification.data.newEta}</span>
                  </div>
                )}
                
                {notification.data.reason && (
                  <div className="text-xs text-red-600">
                    Reason: {notification.data.reason}
                  </div>
                )}
              </div>
            )}
            
            {getActionButtons()}
          </div>
        </div>
        
        <div className="flex-shrink-0 ml-3">
          <button
            onClick={() => onDismiss(notification.id)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FaTimes size={14} />
          </button>
        </div>
      </div>
      
      <div className="mt-2 text-xs text-gray-400">
        {formatDate(notification.createdAt)}
      </div>
    </div>
  );
};

export default RideNotificationCard;
