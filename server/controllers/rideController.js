// server/controllers/rideController.js - Merged implementation
const RideMatch = require('../models/RideMatch');
const { aiMatch } = require('../services/aiMatcher');
const { validateRideOffer, validateRecurringRide } = require('../utils/validate');
const rideNotificationService = require('../services/rideNotificationService');
const mongoose = require('mongoose'); // Added for mongoose.Types.ObjectId

/**
 * Get all available rides (no search parameters required)
 */
exports.getAllAvailableRides = async (req, res) => {
  try {
    console.log('=== getAllAvailableRides called ===');
    
    const totalRides = await RideMatch.countDocuments();
    console.log('Total rides in database:', totalRides);
    
    const currentTime = new Date();
    console.log('Current time:', currentTime);
    
    const rides = await RideMatch.find({
      status: { $ne: 'completed' }
    })
    .populate('riderId', 'name email avatarUrl')
    .sort({ createdAt: -1 })
    .lean();

    const validRides = rides.filter(ride => ride.riderId);

    // Compute simple average rating per ride owner from ride.ratings across their rides (cheap approach)
    // Note: For performance, a separate ratings collection would be better. Here we approximate using RideMatch.ratings.
    const ownerIds = [...new Set(validRides.map(r => r.riderId && r.riderId._id && r.riderId._id.toString()))].filter(Boolean);
    const ownerRatingsMap = new Map();
    if (ownerIds.length > 0) {
      const ownerRides = await RideMatch.find({ riderId: { $in: ownerIds } }).select('riderId ratings').lean();
      ownerIds.forEach(ownerId => {
        const ridesForOwner = ownerRides.filter(or => (or.riderId && or.riderId.toString()) === ownerId);
        const allRatings = ridesForOwner.flatMap(or => or.ratings || []);
        if (allRatings.length > 0) {
          const avg = (allRatings.reduce((sum, rr) => sum + (rr.score || 0), 0) / allRatings.length).toFixed(1);
          ownerRatingsMap.set(ownerId, { averageRating: Number(avg), totalRatings: allRatings.length });
        }
      });
    }

    const withOwnerRatings = validRides.map(r => {
      const key = r.riderId && r.riderId._id ? r.riderId._id.toString() : null;
      const meta = key ? ownerRatingsMap.get(key) : null;
      const seatsTaken = (r.confirmedRiders || []).reduce((sum, cr) => sum + (cr.seatCount || 1), 0);
      const seatsRemaining = (r.availableSeats || 1) - seatsTaken;
      return {
        ...r,
        ...(meta ? { averageRating: meta.averageRating, totalRatings: meta.totalRatings } : {}),
        seatsRemaining: Math.max(0, seatsRemaining)
      };
    });

    res.json(withOwnerRatings);
  } catch (err) {
    console.error('Error getting all available rides:', err);
    res.status(500).json({ error: err.message || 'Failed to get available rides' });
  }
};

/**
 * Search for ride matches
 */
exports.findRideMatches = async (req, res) => {
  try {
    const { departureTime, startLocation, endLocation } = req.query;
    
    if (!departureTime || !startLocation) {
      return res.status(400).json({ error: 'Missing departureTime or startLocation' });
    }
    
    const targetTime = new Date(departureTime);
    const startTime = new Date(targetTime.getTime() - 30 * 60000);
    const endTime = new Date(targetTime.getTime() + 30 * 60000);
    
    const query = {
      departureTime: { $gte: startTime, $lte: endTime },
      startLocation: startLocation,
      status: { $ne: 'completed' }
    };
    
    if (endLocation) {
      query.endLocation = endLocation;
    }
    
    const rides = await RideMatch.find(query)
      .populate('riderId', 'name email avatarUrl')
      .sort({ departureTime: 1 })
      .lean();

    const validRides = rides.filter(ride => ride.riderId);

    const ownerIds = [...new Set(validRides.map(r => r.riderId && r.riderId._id && r.riderId._id.toString()))].filter(Boolean);
    const ownerRatingsMap = new Map();
    if (ownerIds.length > 0) {
      const ownerRides = await RideMatch.find({ riderId: { $in: ownerIds } }).select('riderId ratings').lean();
      ownerIds.forEach(ownerId => {
        const ridesForOwner = ownerRides.filter(or => (or.riderId && or.riderId.toString()) === ownerId);
        const allRatings = ridesForOwner.flatMap(or => or.ratings || []);
        if (allRatings.length > 0) {
          const avg = (allRatings.reduce((sum, rr) => sum + (rr.score || 0), 0) / allRatings.length).toFixed(1);
          ownerRatingsMap.set(ownerId, { averageRating: Number(avg), totalRatings: allRatings.length });
        }
      });
    }

    const withOwnerRatings = validRides.map(r => {
      const key = r.riderId && r.riderId._id ? r.riderId._id.toString() : null;
      const meta = key ? ownerRatingsMap.get(key) : null;
      const seatsTaken = (r.confirmedRiders || []).reduce((sum, cr) => sum + (cr.seatCount || 1), 0);
      const seatsRemaining = (r.availableSeats || 1) - seatsTaken;
      return {
        ...r,
        ...(meta ? { averageRating: meta.averageRating, totalRatings: meta.totalRatings } : {}),
        seatsRemaining: Math.max(0, seatsRemaining)
      };
    });

    res.json(withOwnerRatings);
  } catch (err) {
    console.error('Error finding ride matches:', err);
    res.status(500).json({ error: err.message || 'Failed to find rides' });
  }
};

/**
 * Create a one-time ride offer
 */
exports.createRideOffer = async (req, res) => {
  try {
    const validationError = validateRideOffer(req.body);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }
    
    const { riderId, departureTime, startLocation, endLocation, recurring, availableSeats = 1 } = req.body;
    
    // Replace riderId with authenticated user if not provided
    const effectiveRiderId = riderId || req.user.id || req.user.userId;
    
    // Create a new ride offer
    const newRide = new RideMatch({
      riderId: effectiveRiderId,
      departureTime: new Date(departureTime),
      startLocation,
      endLocation,
      recurring: recurring || null,
      status: 'pending',
      availableSeats: Number(availableSeats) || 1,
      requestedRiders: [],
      confirmedRiders: []
    });
    
    await newRide.save();
    res.status(201).json(newRide);
  } catch (err) {
    console.error('Error creating ride offer:', err);
    res.status(500).json({ error: err.message || 'Failed to create ride offer' });
  }
};

// Utility to compute seats already taken (confirmed)
function getSeatsTaken(ride) {
  const seats = (ride.confirmedRiders || []).reduce((sum, r) => sum + (r.seatCount || 1), 0);
  return seats;
}

/**
 * Create recurring rides
 */
exports.createRecurringRides = async (req, res) => {
  try {
    const { riderId, startLocation, endLocation, recurring } = req.body;
    
    const error = validateRecurringRide(req.body);
    if (error) {
      return res.status(400).json({ error });
    }
    
    // Replace riderId with authenticated user if not provided
    const effectiveRiderId = riderId || req.user.id || req.user.userId;
    
    const today = new Date();
    const createdRides = [];
    
    // Map weekdays to index
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const next7Days = Array.from({ length: 14 }).map((_, i) => {
      const date = new Date();
      date.setDate(today.getDate() + i);
      return date;
    });
    
    for (let date of next7Days) {
      const dayName = weekdays[date.getDay()];
      if (recurring.days.includes(dayName)) {
        const departureTime = new Date(date);
        departureTime.setHours(recurring.hour || 8); // default 8 AM
        departureTime.setMinutes(recurring.minute || 0);
        
        const ride = new RideMatch({
          riderId: effectiveRiderId,
          startLocation,
          endLocation,
          departureTime,
          recurring,
          status: 'pending',
          requestedRiders: [],
          confirmedRiders: []
        });
        
        await ride.save();
        createdRides.push(ride);
      }
    }
    
    res.status(201).json({
      message: 'Recurring rides created',
      rides: createdRides
    });
  } catch (err) {
    console.error('Error in recurring ride creation:', err);
    res.status(500).json({ error: err.message || 'Failed to create recurring rides' });
  }
};

/**
 * Request to join a ride
 */
exports.requestToJoinRide = async (req, res) => {
  try {
    const { rideId, userId, seatCount = 1 } = req.body;
    
    // Replace userId with authenticated user if not provided
    const effectiveUserId = userId || req.user.id || req.user.userId;
    
    const ride = await RideMatch.findById(rideId);
    if (!ride) {
      return res.status(404).json({ error: "Ride not found" });
    }
    
    // Check capacity
    const seatsRequested = Number(seatCount) || 1;
    const seatsTaken = getSeatsTaken(ride);
    const seatsRemaining = (ride.availableSeats || 1) - seatsTaken;
    if (seatsRequested > seatsRemaining) {
      return res.status(400).json({ error: `Not enough seats. Remaining: ${Math.max(0, seatsRemaining)}` });
    }
    
    // Check if user is the ride creator
    if (ride.riderId.toString() === effectiveUserId.toString()) {
      return res.status(400).json({ error: "You can't join your own ride" });
    }
    
    // Check if already requested
    if (ride.requestedRiders.some(r => {
      const userIdToCheck = r.user._id ? r.user._id.toString() : r.user.toString();
      return userIdToCheck === effectiveUserId.toString();
    })) {
      return res.status(400).json({ error: "You have already requested to join this ride" });
    }
    
    // Check if already confirmed
    if (ride.confirmedRiders.some(r => {
      const userIdToCheck = r.user._id ? r.user._id.toString() : r.user.toString();
      return userIdToCheck === effectiveUserId.toString();
    })) {
      return res.status(400).json({ error: "You are already confirmed for this ride" });
    }
    
    ride.requestedRiders.push({ user: effectiveUserId, seatCount: seatsRequested });
    await ride.save();
    
    // Send notification to ride owner about the request
    try {
      await rideNotificationService.sendRideRequestNotification(rideId, effectiveUserId, ride.riderId);
    } catch (notificationError) {
      console.error('Error sending ride request notification:', notificationError);
    }
    
    res.json({
      message: "Ride request sent",
      ride
    });
  } catch (err) {
    console.error('Error requesting ride:', err);
    res.status(500).json({ error: err.message || 'Failed to request ride' });
  }
};

/**
 * Confirm a ride request
 */
exports.confirmRideRequest = async (req, res) => {
  try {
    const { rideId, userId, requestId } = req.body;
    console.log('✅ confirmRideRequest: Received request with rideId:', rideId, 'userId:', userId, 'requestId:', requestId);
    console.log('✅ userId type:', typeof userId);

    const ride = await RideMatch.findById(rideId);
    
    if (!ride) {
      console.log('❌ confirmRideRequest: Ride not found for rideId:', rideId);
      return res.status(404).json({ error: "Ride not found" });
    }
    
    console.log('Ride found. Requested riders:', JSON.stringify(ride.requestedRiders, null, 2));

    // Check if the requester is authorized (ride owner)
    const requesterId = req.user.id || req.user.userId;
    if (ride.riderId.toString() !== requesterId.toString()) {
      console.log('❌ confirmRideRequest: Unauthorized. Ride owner is', ride.riderId, 'but requester is', requesterId);
      return res.status(403).json({ error: "Only the ride creator can confirm requests" });
    }

    // Capacity check before confirming
    const seatsTaken = getSeatsTaken(ride);
    const seatsRemaining = (ride.availableSeats || 1) - seatsTaken;
    const pending = ride.requestedRiders || [];
    const match = pending.find(r => (requestId && r._id && r._id.toString() === requestId) || (userId && ((r.user._id ? r.user._id.toString() : r.user.toString()) === userId)));
    const seatsRequested = match ? (match.seatCount || 1) : 1;
    if (seatsRequested > seatsRemaining) {
      return res.status(400).json({ error: `Cannot confirm. Only ${Math.max(0, seatsRemaining)} seats remaining.` });
    }

    // Check if already confirmed
    const alreadyConfirmed = ride.confirmedRiders.some(r => {
      const uid = r.user && r.user._id ? r.user._id.toString() : r.user.toString();
      return userId && uid === userId.toString();
    });
    if (alreadyConfirmed) {
      console.log('❌ confirmRideRequest: User', userId, 'is already confirmed for this ride.');
      return res.status(400).json({ error: "User already confirmed" });
    }
    
    // Find the request by requestId or userId
    const targetUserId = userId ? userId.toString() : null;
    const targetRequestId = requestId ? requestId.toString() : null;

    const reqIndex = ride.requestedRiders.findIndex(r => {
      const rId = r._id ? r._id.toString() : null;
      const rUserId = r.user && r.user._id ? r.user._id.toString() : r.user.toString();
      return (targetRequestId && rId === targetRequestId) || (targetUserId && rUserId === targetUserId);
    });

    if (reqIndex === -1) {
      console.log('❌ confirmRideRequest: Request not found for user', targetUserId, 'or requestId', targetRequestId, 'in requestedRiders.');
      console.log('❌ Available requestedRiders:', ride.requestedRiders.map(r => ({
        requestId: r._id ? r._id.toString() : null,
        user: r.user && r.user._id ? r.user._id.toString() : r.user.toString(),
        seatCount: r.seatCount
      })));
      return res.status(404).json({ error: "Request not found" });
    }

    const [riderReq] = ride.requestedRiders.splice(reqIndex, 1);
    ride.confirmedRiders.push(riderReq);
    
    // Mark ride as "confirmed" if 1st person joins
    if (ride.confirmedRiders.length === 1) {
      ride.status = "confirmed";
    }
    
    await ride.save();
    
    // Re-fetch with population so frontend gets user details
    const populatedRide = await RideMatch.findById(ride._id)
      .populate({ path: 'requestedRiders.user', select: 'name email avatarUrl' })
      .populate({ path: 'confirmedRiders.user', select: 'name email avatarUrl' });
    
    // Send confirmation notification to the confirmed user
    try {
      const confirmedUserId = riderReq.user && riderReq.user._id ? riderReq.user._id.toString() : riderReq.user.toString();
      await rideNotificationService.sendRideRequestAccepted(rideId, confirmedUserId, requesterId);
    } catch (notificationError) {
      console.error('Error sending ride confirmation notification:', notificationError);
    }
    
    res.json({
      message: "Rider confirmed",
      ride: populatedRide
    });
  } catch (err) {
    console.error('Error confirming rider:', err);
    res.status(500).json({ error: err.message || 'Failed to confirm rider' });
  }
};

/**
 * Deny a ride request
 */
exports.denyRideRequest = async (req, res) => {
  try {
    const { rideId, userId } = req.body;
    const ride = await RideMatch.findById(rideId);
    
    if (!ride) {
      return res.status(404).json({ error: "Ride not found" });
    }
    
    // Check if the requester is authorized (ride owner)
    const requesterId = req.user.id || req.user.userId;
    if (ride.riderId.toString() !== requesterId.toString()) {
      return res.status(403).json({ error: "Only the ride creator can deny requests" });
    }
    
    // Remove from requested list
    ride.requestedRiders = ride.requestedRiders.filter(r => {
      // Handle both populated user objects and ObjectId references
      const userIdToCheck = r.user._id ? r.user._id.toString() : r.user.toString();
      return userIdToCheck !== userId;
    });
    
    await ride.save();
    
    // Re-fetch with population so frontend gets user details
    const populatedRide = await RideMatch.findById(ride._id)
      .populate({ path: 'requestedRiders.user', select: 'name email avatarUrl' })
      .populate({ path: 'confirmedRiders.user', select: 'name email avatarUrl' });
    
    // Send denial notification to the requester
    try {
      await rideNotificationService.sendRideRequestDenied(rideId, userId, requesterId);
    } catch (notificationError) {
      console.error('Error sending ride denial notification:', notificationError);
    }
    
    res.json({
      message: "Request denied",
      ride: populatedRide
    });
  } catch (err) {
    console.error('Error denying request:', err);
    res.status(500).json({ error: err.message || 'Failed to deny request' });
  }
};

/**
 * Get ride by ID
 */
exports.getRideById = async (req, res) => {
  try {
    const { rideId } = req.params;
    console.log('🔍 getRideById called with rideId:', rideId);
    console.log('🔍 Request user ID:', req.user.id || req.user.userId);
    console.log('🔍 RideId type:', typeof rideId);
    console.log('🔍 Request headers:', req.headers);
    
    // Validate rideId format
    if (!rideId || !/^[0-9a-fA-F]{24}$/.test(rideId)) {
      console.log('❌ Invalid rideId format:', rideId);
      return res.status(400).json({ error: 'Invalid ride ID format' });
    }
    
    const ride = await RideMatch.findById(rideId)
      .populate({
        path: 'requestedRiders.user',
        select: 'name email avatarUrl'
      })
      .populate({
        path: 'confirmedRiders.user',
        select: 'name email avatarUrl'
      });
      
    if (!ride) {
      console.log('❌ Ride not found in database for ID:', rideId);
      console.log('❌ Checking if ride exists with different formats...');
      
      // Try to find the ride with different ID formats for debugging
      const rideAsString = await RideMatch.findById(rideId.toString());
      const rideAsObjectId = await RideMatch.findById(new mongoose.Types.ObjectId(rideId));
      
      console.log('❌ Ride as string search result:', rideAsString ? 'Found' : 'Not found');
      console.log('❌ Ride as ObjectId search result:', rideAsObjectId ? 'Found' : 'Not found');
      
      return res.status(404).json({ error: 'Ride not found' });
    }
    
    console.log('✅ Ride found:', {
      id: ride._id,
      startLocation: ride.startLocation,
      endLocation: ride.endLocation,
      riderId: ride.riderId
    });
    
    res.json(ride);
  } catch (err) {
    console.error('❌ Error getting ride:', err);
    res.status(500).json({ error: err.message || 'Failed to get ride' });
  }
};



/**
 * Get rides created by a user
 */
exports.getRidesByOwner = async (req, res) => {
  try {
    const { ownerId } = req.params;
    
    // Replace ownerId with authenticated user if not provided or "me"
    const effectiveOwnerId = (ownerId === 'me') 
      ? (req.user.id || req.user.userId) 
      : ownerId;
    
    const rides = await RideMatch.find({ riderId: effectiveOwnerId })
      .populate({
        path: 'confirmedRiders.user',
        select: 'name email avatarUrl'
      })
      .lean();
    
    // Add average rating calculation
    const withRatings = rides.map(r => {
      const { ratings = [] } = r;
      const avg = ratings.length > 0
        ? (ratings.reduce((sum, rr) => sum + rr.score, 0) / ratings.length).toFixed(1)
        : null;
        
      return {
        ...r,
        averageRating: avg,
        totalRatings: ratings.length
      };
    });
    
    res.json(withRatings);
  } catch (err) {
    console.error('Error getting user rides:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch rides' });
  }
};

/**
 * Update a ride
 */
exports.updateRide = async (req, res) => {
  try {
    const { rideId } = req.params;
    const updates = req.body;
    
    // Find the ride
    const ride = await RideMatch.findById(rideId);
    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }
    
    // Check if user is authorized (ride owner)
    const userId = req.user.id || req.user.userId;
    if (ride.riderId.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'Only the ride creator can update the ride' });
    }
    
    // Apply updates
    Object.keys(updates).forEach(key => {
      // Handle special case for departureTime - convert to Date
      if (key === 'departureTime' && updates[key]) {
        ride[key] = new Date(updates[key]);
      } else {
        ride[key] = updates[key];
      }
    });
    
    await ride.save();
    res.json(ride);
  } catch (err) {
    console.error('Error updating ride:', err);
    res.status(500).json({ error: err.message || 'Failed to update ride' });
  }
};

/**
 * Delete a ride
 */
exports.deleteRide = async (req, res) => {
  try {
    const { rideId } = req.params;
    console.log('🗑️ deleteRide called with rideId:', rideId);
    
    // Find the ride
    const ride = await RideMatch.findById(rideId);
    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }
    
    // Check if user is authorized (ride owner)
    const userId = req.user.id || req.user.userId;
    if (ride.riderId.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'Only the ride creator can delete the ride' });
    }
    
    // Delete the ride
    await RideMatch.findByIdAndDelete(rideId);
    console.log('✅ Ride deleted successfully');
    
    // Clean up orphaned notifications for this ride
    try {
      const rideNotificationService = require('../services/rideNotificationService');
      await rideNotificationService.cleanupOrphanedNotifications();
      console.log('✅ Notifications cleaned up after ride deletion');
    } catch (cleanupError) {
      console.error('⚠️ Warning: Failed to cleanup notifications:', cleanupError);
      // Don't fail the ride deletion if notification cleanup fails
    }
    
    res.json({ message: 'Ride deleted' });
  } catch (err) {
    console.error('❌ Error deleting ride:', err);
    res.status(500).json({ error: err.message || 'Failed to delete ride' });
  }
};

/**
 * Submit a rating for a rider
 */
exports.submitRating = async (req, res) => {
  try {
    const { rideId, riderId, score, comment } = req.body;
    
    if (!rideId || !riderId || !score) {
      return res.status(400).json({ error: 'Missing rating data' });
    }
    
    // Validate score
    if (score < 1 || score > 5) {
      return res.status(400).json({ error: 'Score must be between 1 and 5' });
    }
    
    // Find the ride
    const ride = await RideMatch.findById(rideId);
    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }
    
    // Check if rider was confirmed
    const isConfirmed = ride.confirmedRiders.some(id => id.user.toString() === riderId);
    if (!isConfirmed) {
      return res.status(403).json({ error: 'Rider not confirmed in this ride' });
    }
    
    // Check for duplicate rating
    const alreadyRated = ride.ratings && ride.ratings.some(r => r.riderId.toString() === riderId);
    if (alreadyRated) {
      return res.status(400).json({ error: 'You have already rated this rider' });
    }
    
    // Add the rating
    if (!ride.ratings) {
      ride.ratings = [];
    }
    
    ride.ratings.push({
      riderId,
      score: Number(score),
      comment: comment || ''
    });
    
    await ride.save();
    
    res.json({
      message: 'Rating submitted',
      ratings: ride.ratings
    });
  } catch (err) {
    console.error('Error submitting rating:', err);
    res.status(500).json({ error: err.message || 'Failed to submit rating' });
  }
};

/**
 * Get AI-based ride matches
 */
exports.getAiMatches = async (req, res) => {
  try {
    const { startLocation, endLocation, departureTime } = req.body;
    
    if (!startLocation || !departureTime) {
      return res.status(400).json({ error: 'Missing match parameters' });
    }
    
    const matches = await aiMatch({
      startLocation,
      endLocation: endLocation || '',
      departureTime
    });
    
    res.json(matches);
  } catch (err) {
    console.error('AI match error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate AI matches' });
  }
  };
/**
 * Stream AI-based ride matches and update on new data
 * Utilizes Server-Sent Events to push re-scored matches whenever the
 * RideMatch collection changes.
 */
exports.streamAiMatches = async (req, res) => {
  try {
    const { startLocation, endLocation, departureTime } = req.query;

    if (!startLocation || !departureTime) {
      return res.status(400).json({ error: 'Missing match parameters' });
    }

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    if (res.flushHeaders) res.flushHeaders();

    const sendMatches = async () => {
      const matches = await aiMatch({
        startLocation,
        endLocation: endLocation || '',
        departureTime
      });
      res.write(`data: ${JSON.stringify(matches)}\n\n`);
    };

    // Send initial set of matches
    await sendMatches();

    // Watch for changes in RideMatch collection
    const changeStream = RideMatch.watch();
    changeStream.on('change', async () => {
      await sendMatches();
    });

    // Cleanup on client disconnect
    req.on('close', () => {
      changeStream.close();
      res.end();
    });
  } catch (err) {
    console.error('AI match stream error:', err);
    res.status(500).end();
  }
};

/**
 * Update ETA for a ride
 */
exports.updateEta = async (req, res) => {
  try {
    const { rideId } = req.params;
    const { newEta } = req.body;
    const userId = req.user.id || req.user.userId;

    if (!newEta) {
      return res.status(400).json({ error: 'New ETA is required' });
    }

    const ride = await RideMatch.findById(rideId);
    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    // Check if user is the ride owner or a confirmed passenger
    const isOwner = ride.riderId.toString() === userId;
    const isPassenger = ride.confirmedRiders.some(r => r.user.toString() === userId);
    
    if (!isOwner && !isPassenger) {
      return res.status(403).json({ error: 'You can only update ETA for rides you are part of' });
    }

    // Get all participants (rider + confirmed passengers)
    const participantIds = [
      ride.riderId.toString(),
      ...ride.confirmedRiders.map(r => r.user.toString())
    ];

    // Send ETA change notification to all participants
    try {
      await rideNotificationService.sendEtaChange(rideId, userId, newEta, participantIds);
    } catch (notificationError) {
      console.error('Error sending ETA change notification:', notificationError);
    }

    res.json({
      message: 'ETA updated successfully',
      newEta: newEta
    });
  } catch (err) {
    console.error('Error updating ETA:', err);
    res.status(500).json({ error: err.message || 'Failed to update ETA' });
  }
};

/**
 * Cancel a ride
 */
exports.cancelRide = async (req, res) => {
  try {
    const { rideId } = req.params;
    const { reason } = req.body;
    const userId = req.user.id || req.user.userId;

    const ride = await RideMatch.findById(rideId);
    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    // Check if user is the ride owner or a confirmed passenger
    const isOwner = ride.riderId.toString() === userId;
    const isPassenger = ride.confirmedRiders.some(r => {
      const userIdToCheck = r.user._id ? r.user._id.toString() : r.user.toString();
      return userIdToCheck === userId;
    });
    
    if (!isOwner && !isPassenger) {
      return res.status(403).json({ error: 'You can only cancel rides you are part of' });
    }

    // Get all participants (rider + confirmed passengers)
    const participantIds = [
      ride.riderId.toString(),
      ...ride.confirmedRiders.map(r => r.user.toString())
    ];

    // Update ride status
    ride.status = 'cancelled';
    await ride.save();

    // Send cancellation notification to all participants
    try {
      await rideNotificationService.sendRideCancellation(rideId, userId, participantIds, reason);
    } catch (notificationError) {
      console.error('Error sending ride cancellation notification:', notificationError);
    }

    res.json({
      message: 'Ride cancelled successfully',
      ride: ride
    });
  } catch (err) {
    console.error('Error cancelling ride:', err);
    res.status(500).json({ error: err.message || 'Failed to cancel ride' });
  }
};

/**
 * Mark ride as completed
 */
exports.completeRide = async (req, res) => {
  try {
    const { rideId } = req.params;
    const userId = req.user.id || req.user.userId;

    const ride = await RideMatch.findById(rideId);
    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    // Check if user is the ride owner or a confirmed passenger
    const isOwner = ride.riderId.toString() === userId;
    const isPassenger = ride.confirmedRiders.some(r => {
      const userIdToCheck = r.user._id ? r.user._id.toString() : r.user.toString();
      return userIdToCheck === userId;
    });
    
    if (!isOwner && !isPassenger) {
      return res.status(403).json({ error: 'You can only complete rides you are part of' });
    }

    // Get all participants (rider + confirmed passengers)
    const participantIds = [
      ride.riderId.toString(),
      ...ride.confirmedRiders.map(r => r.user.toString())
    ];

    // Update ride status
    ride.status = 'completed';
    await ride.save();

    // Send completion notification to all participants
    try {
      await rideNotificationService.sendRideCompletion(rideId, userId, participantIds);
    } catch (notificationError) {
      console.error('Error sending ride completion notification:', notificationError);
    }

    res.json({
      message: 'Ride marked as completed',
      ride: ride
    });
  } catch (err) {
    console.error('Error completing ride:', err);
    res.status(500).json({ error: err.message || 'Failed to complete ride' });
  }
};