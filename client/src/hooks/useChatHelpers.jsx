import { useCallback } from 'react';

export const useChatHelpers = () => {
  const currentUserId = sessionStorage.getItem('userId');

  // Get chat display name (other user's name)
  const getChatName = useCallback((chat) => {
    try {
      if (!chat || !chat.members || !Array.isArray(chat.members) || chat.members.length === 0) {
        return 'Chat';
      }
      
      const otherMembers = chat.members.filter(m => 
        m && (typeof m === 'string' ? m !== currentUserId : m._id !== currentUserId)
      );
      
      if (otherMembers.length === 0) return 'Just you';
      
      return otherMembers.map(m => {
        if (typeof m === 'string') return 'User';
        return m.name || 'User';
      }).join(', ');
    } catch (err) {
      console.error('Error getting chat name:', err);
      return 'Chat';
    }
  }, [currentUserId]);

  // Handle message sender correctly based on format
  const isSenderCurrentUser = useCallback((sender) => {
    if (!sender) return false;
    if (typeof sender === 'string') return sender === currentUserId;
    if (typeof sender === 'object' && sender._id) return sender._id === currentUserId;
    return false;
  }, [currentUserId]);

  // Get sender name from message
  const getSenderName = useCallback((sender) => {
    if (!sender) return 'Unknown User';
    if (typeof sender === 'string') return 'Unknown User';
    return sender.name || 'Unknown User';
  }, []);

  // Get user avatar URL
  const getUserAvatar = useCallback((userId, userProfiles) => {
    if (!userId || !userProfiles[userId]) {
      return null;
    }
    return userProfiles[userId].avatarUrl;
  }, []);

  // Render avatar component with improved error handling
  const renderAvatar = useCallback((userId, name, size = 'w-10 h-10', preferredUrl = null, userProfiles = {}) => {
    let normalizedPreferred = preferredUrl;
    if (preferredUrl && typeof preferredUrl === 'object') {
      normalizedPreferred = preferredUrl.avatarUrl || preferredUrl.avatar || preferredUrl.profilePic || null;
    }
    let avatarUrl = normalizedPreferred || getUserAvatar(userId, userProfiles);
    
    if (userId === currentUserId && !avatarUrl) {
      avatarUrl = sessionStorage.getItem(`userAvatarUrl_${userId}`);
    }
    
    if (!avatarUrl && userProfiles[userId]) {
      avatarUrl = userProfiles[userId].avatarUrl || userProfiles[userId].avatar || userProfiles[userId].profilePic || null;
    }
    
    const getInitials = (name) => {
      if (!name || typeof name !== 'string') return 'U';
      const words = name.trim().split(' ');
      if (words.length >= 2) {
        return (words[0][0] + words[1][0]).toUpperCase();
      }
      return name.charAt(0).toUpperCase();
    };
    
    if (!avatarUrl && name) {
      avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&bold=true&size=128`;
    }
    
    if (avatarUrl) {
      return (
        <div className="relative">
          <img 
            src={avatarUrl} 
            alt={name || 'User'} 
            className={`${size} rounded-full object-cover shadow-md`}
            onError={(e) => {
              e.target.style.display = 'none';
              const fallback = e.target.nextSibling;
              if (fallback) {
                fallback.style.display = 'flex';
              }
            }}
            loading="lazy"
          />
          <div className={`${size} rounded-full bg-bracu-blue flex items-center justify-center text-white font-medium shadow-md absolute inset-0 hidden`}>
            {getInitials(name)}
          </div>
        </div>
      );
    }
    
    return (
      <div className={`${size} rounded-full bg-bracu-blue flex items-center justify-center text-white font-medium shadow-md`}>
        {getInitials(name)}
      </div>
    );
  }, [currentUserId, getUserAvatar]);

  return {
    getChatName,
    isSenderCurrentUser,
    getSenderName,
    getUserAvatar,
    renderAvatar
  };
};
