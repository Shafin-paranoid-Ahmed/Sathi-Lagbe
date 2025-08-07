// server/controllers/friendController.js - Refactored to use new Friend model
const Friend = require('../models/Friend');
const User = require('../models/User');

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

    // Populate user details for response
    await friendRequest.populate('user', 'name email profilePicture');

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

    friendRequest.status = 'rejected';
    await friendRequest.save();

    res.json({
      message: 'Friend request rejected',
      friendRequest
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
    const { status } = req.query;

    let query = {
      $or: [
        { user: userId },
        { friend: userId }
      ]
    };

    if (status) {
      query.status = status;
    }

    const friendRequests = await Friend.find(query)
      .populate('user', 'name email profilePicture')
      .populate('friend', 'name email profilePicture')
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
    .populate('user', 'name email profilePicture status')
    .populate('friend', 'name email profilePicture status');

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