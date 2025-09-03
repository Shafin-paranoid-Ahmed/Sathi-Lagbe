// server/controllers/friendController.js - Refactored to use new Friend model
const Friend = require('../models/Friend');
const User = require('../models/User');
const { getIO } = require('../utils/socket');
const SosContact = require('../models/sosContact');

/**
 * Send a friend request
 */
exports.sendFriendRequest = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { friendId } = req.body;

    if (!friendId) {
      return res.status(400).json({ error: 'Friend ID is required' });
    }

    if (userId === friendId) {
      return res.status(400).json({ error: 'Cannot send friend request to yourself' });
    }

    // Check if friend exists
    const friendExists = await User.findById(friendId);
    if (!friendExists) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if friendship already exists
    const existingFriendship = await Friend.findOne({
      $or: [
        { user: userId, friend: friendId },
        { user: friendId, friend: userId }
      ]
    });

    if (existingFriendship) {
      return res.status(400).json({ error: 'Friendship already exists or request already sent' });
    }

    // Create new friend request
    const friendRequest = new Friend({
      user: userId,
      friend: friendId,
      status: 'pending'
    });

    await friendRequest.save();

    // Populate user details for response
    await friendRequest.populate('friend', 'name email profilePicture');

    // Realtime update for both users
    try {
      const io = getIO();
      io.to(`user_${userId}`).emit('friends_updated', { reason: 'request_sent' });
      io.to(`user_${friendId}`).emit('friends_updated', { reason: 'request_received' });
    } catch (e) {
      console.warn('friends_updated emit failed:', e?.message);
    }

    res.status(201).json({
      message: 'Friend request sent successfully',
      friendRequest
    });
  } catch (err) {
    console.error('Error sending friend request:', err);
    res.status(500).json({ error: err.message || 'Failed to send friend request' });
  }
};

/**
 * Accept a friend request
 */
exports.acceptFriendRequest = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { requestId } = req.params;

    const friendRequest = await Friend.findById(requestId);

    if (!friendRequest) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    if (friendRequest.friend.toString() !== userId) {
      return res.status(403).json({ error: 'Not authorized to accept this request' });
    }

    if (friendRequest.status !== 'pending') {
      return res.status(400).json({ error: 'Request is not pending' });
    }

    friendRequest.status = 'accepted';
    await friendRequest.save();

    // Best-effort: scaffold each other into SOS list as in-app contact (non-blocking)
    try {
      const pairs = [
        { owner: friendRequest.user, contact: friendRequest.friend },
        { owner: friendRequest.friend, contact: friendRequest.user }
      ];
      for (const p of pairs) {
        let entry = await SosContact.findOne({ user: p.owner });
        if (!entry) entry = await SosContact.create({ user: p.owner, contacts: [] });
        const exists = (entry.contacts || []).some(c => c.userId?.toString() === p.contact.toString());
        if (!exists) {
          entry.contacts.push({ name: '', phone: '', userId: p.contact });
          await entry.save();
        }
      }
    } catch (e) {
      console.warn('SOS scaffold on friend accept failed:', e?.message);
    }

    // Populate user details for response
    await friendRequest.populate('user', 'name email profilePicture');

    // Realtime update for both users
    try {
      const io = getIO();
      io.to(`user_${friendRequest.user}`).emit('friends_updated', { reason: 'request_accepted' });
      io.to(`user_${friendRequest.friend}`).emit('friends_updated', { reason: 'request_accepted' });
    } catch (e) {
      console.warn('friends_updated emit failed:', e?.message);
    }

    res.json({
      message: 'Friend request accepted',
      friendRequest
    });
  } catch (err) {
    console.error('Error accepting friend request:', err);
    res.status(500).json({ error: err.message || 'Failed to accept friend request' });
  }
};

/**
 * Reject a friend request
 */
exports.rejectFriendRequest = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { requestId } = req.params;

    const friendRequest = await Friend.findById(requestId);

    if (!friendRequest) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    if (friendRequest.friend.toString() !== userId) {
      return res.status(403).json({ error: 'Not authorized to reject this request' });
    }

    if (friendRequest.status !== 'pending') {
      return res.status(400).json({ error: 'Request is not pending' });
    }

    // Remove the pending request instead of setting an unsupported 'rejected' status
    await Friend.findByIdAndDelete(requestId);

    // Realtime update for both users
    try {
      const io = getIO();
      io.to(`user_${friendRequest.user}`).emit('friends_updated', { reason: 'request_rejected' });
      io.to(`user_${friendRequest.friend}`).emit('friends_updated', { reason: 'request_rejected' });
    } catch (e) {
      console.warn('friends_updated emit failed:', e?.message);
    }

    res.json({
      message: 'Friend request rejected',
      requestId
    });
  } catch (err) {
    console.error('Error rejecting friend request:', err);
    res.status(500).json({ error: err.message || 'Failed to reject friend request' });
  }
};

/**
 * Get all friend requests (pending, accepted, rejected)
 */
exports.getFriendRequests = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { status, scope } = req.query;

    let query = {};
    if (scope === 'incoming') {
      query.friend = userId;
    } else if (scope === 'outgoing') {
      query.user = userId;
    } else {
      query.$or = [{ user: userId }, { friend: userId }];
    }
    if (status) query.status = status;

    const friendRequests = await Friend.find(query)
      .populate('user', 'name email avatarUrl')
      .populate('friend', 'name email avatarUrl')
      .sort({ updatedAt: -1 });

    res.json(friendRequests);
  } catch (err) {
    console.error('Error getting friend requests:', err);
    res.status(500).json({ error: err.message || 'Failed to get friend requests' });
  }
};

/**
 * Get all accepted friends
 */
exports.getAcceptedFriends = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;

    const acceptedFriendships = await Friend.find({
      status: 'accepted',
      $or: [
        { user: userId },
        { friend: userId }
      ]
    })
    .populate('user', 'name email avatarUrl status')
    .populate('friend', 'name email avatarUrl status');

    // Transform the data to show friend details consistently
    const friends = acceptedFriendships.map(friendship => {
      const isUser = friendship.user._id.toString() === userId;
      const friendDetails = isUser ? friendship.friend : friendship.user;
      return {
        friendshipId: friendship._id,
        friend: friendDetails,
        createdAt: friendship.createdAt
      };
    });

    res.json(friends);
  } catch (err) {
    console.error('Error getting accepted friends:', err);
    res.status(500).json({ error: err.message || 'Failed to get accepted friends' });
  }
};

/**
 * Get friends who have opted-in to routine sharing, along with their status
 */
exports.getFriendsWithStatus = async (req, res) => {
    try {
        const userId = req.user.id || req.user.userId;

        // Debug logging removed for security

        if (!userId) {
            // Authentication error logging removed for security
            return res.status(401).json({ error: 'User not authenticated' });
        }

        // First, just try to get basic friend data without complex population
        const acceptedFriendships = await Friend.find({
            status: 'accepted',
            $or: [
                { user: userId },
                { friend: userId }
            ]
        });

        console.log('Found accepted friendships:', acceptedFriendships.length);

        if (acceptedFriendships.length === 0) {
            console.log('No friendships found, returning empty array');
            return res.json([]);
        }

        // Manually populate friends to avoid potential population issues
        const friendIds = acceptedFriendships.map(friendship => {
            const isUser = friendship.user.toString() === userId;
            return isUser ? friendship.friend : friendship.user;
        });

        console.log('Friend IDs to fetch:', friendIds);

        const friends = await User.find({
            _id: { $in: friendIds },
            routineSharingEnabled: { $ne: false } // Only get friends who allow routine sharing
        }).select('name email avatarUrl status routineSharingEnabled');

        console.log('Final friends list:', friends.length);
        console.log('=== getFriendsWithStatus completed successfully ===');

        res.json(friends);
    } catch (err) {
        console.error('=== ERROR in getFriendsWithStatus ===');
        console.error('Error message:', err.message);
        console.error('Full error stack:', err.stack);
        console.error('Error name:', err.name);
        console.error('=== END ERROR ===');
        res.status(500).json({ error: err.message || 'Failed to get friends with status' });
    }
};

/**
 * Remove a friend
 */
exports.removeFriend = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { friendshipId } = req.params;

    const friendship = await Friend.findById(friendshipId);

    if (!friendship) {
      return res.status(404).json({ error: 'Friendship not found' });
    }

    if (friendship.user.toString() !== userId && friendship.friend.toString() !== userId) {
      return res.status(403).json({ error: 'Not authorized to remove this friendship' });
    }

    if (friendship.status !== 'accepted') {
      return res.status(400).json({ error: 'Can only remove accepted friendships' });
    }

    await Friend.findByIdAndDelete(friendshipId);

    res.json({
      message: 'Friend removed successfully'
    });

    // Realtime update for both users
    try {
      const io = getIO();
      io.to(`user_${friendship.user}`).emit('friends_updated', { reason: 'friend_removed' });
      io.to(`user_${friendship.friend}`).emit('friends_updated', { reason: 'friend_removed' });
    } catch (e) {
      console.warn('friends_updated emit failed:', e?.message);
    }
  } catch (err) {
    console.error('Error removing friend:', err);
    res.status(500).json({ error: err.message || 'Failed to remove friend' });
  }
};

/**
 * Block a user
 */
exports.blockUser = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { friendId } = req.body;

    if (!friendId) {
      return res.status(400).json({ error: 'Friend ID is required' });
    }

    if (userId === friendId) {
      return res.status(400).json({ error: 'Cannot block yourself' });
    }

    // Check if user exists
    const userExists = await User.findById(friendId);
    if (!userExists) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Find existing friendship or create new one
    let friendship = await Friend.findOne({
      $or: [
        { user: userId, friend: friendId },
        { user: friendId, friend: userId }
      ]
    });

    if (!friendship) {
      friendship = new Friend({
        user: userId,
        friend: friendId,
        status: 'blocked'
      });
    } else {
      friendship.status = 'blocked';
    }

    await friendship.save();

    res.json({
      message: 'User blocked successfully',
      friendship
    });
  } catch (err) {
    console.error('Error blocking user:', err);
    res.status(500).json({ error: err.message || 'Failed to block user' });
  }
};