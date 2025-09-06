// server/controllers/rideController.js - Merged implementation
const RideMatch = require('../models/RideMatch');
const { aiMatch } = require('../services/aiMatcher');
const { validateRideOffer, validateRecurringRide } = require('../utils/validate');
const User = require('../models/User'); // Add this import
const rideNotificationService = require('../services/rideNotificationService');
const cacheService = require('../services/cacheService');
const mongoose = require('mongoose'); // Added for mongoose.Types.ObjectId

/**
 * Migration function to update existing rides with user gender information
 */
const migrateRidesWithUserData = async () => {
  try {

    
    // Find all rides that don't have riderName or riderGender populated
    const ridesToUpdate = await RideMatch.find({
      $or: [
        { riderName: { $exists: false } },
        { riderName: 'Anonymous User' },
        { riderGender: { $exists: false } },
        { riderGender: '' }
      ]
    });
    

    
    for (const ride of ridesToUpdate) {
      try {
        // Fetch user data
        const user = await User.findById(ride.riderId).select('name email gender');
        
        if (user) {
          // Update the ride with user data
          await RideMatch.findByIdAndUpdate(ride._id, {
            riderName: user.name || 'Anonymous User',
            riderGender: user.gender || ''
          });
          

        } else {

        }
      } catch (err) {
        console.error(`Error updating ride ${ride._id}:`, err);
      }
    }
    

  } catch (err) {
    console.error('Error in ride migration:', err);
  }
};

/**
 * Test endpoint to check user gender and ride data
 */
exports.testGenderData = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;

    
    // Check user data
    const user = await User.findById(userId).select('name email gender');
    
    // Check recent rides by this user
    const userRides = await RideMatch.find({ riderId: userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('riderName riderGender createdAt');
    

    
    // Check all recent rides
    const allRides = await RideMatch.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('riderName riderGender riderId createdAt');
    
    // Ride data logging removed for security
    
    res.json({
      userId,
      userData: user,
      userRides,
      allRides,
      message: 'Check server console for detailed logs'
    });
  } catch (err) {
    console.error('Error in test endpoint:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Debug endpoint to check user data
 */
exports.debugUserData = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    // User data debug logging removed for security
    
    const user = await User.findById(userId).select('name email gender');
    
    res.json({
      userId,
      userData: user,
      message: 'Check server console for detailed logs'
    });
  } catch (err) {
    console.error('Error in debug endpoint:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get all available rides (no search parameters required)
 */
exports.getAllAvailableRides = async (req, res) => {
  try {
    // Check cache first
    const cacheKey = cacheService.getRidesKey({ status: 'available' });
    const cachedRides = await cacheService.get(cacheKey);
    
    if (cachedRides) {
      return res.json(cachedRides);
    }

    await migrateRidesWithUserData();
    
    const rides = await RideMatch.find({ status: { $ne: 'completed' } })
      .populate('riderId', 'name email avatarUrl gender')
      .sort({ createdAt: -1 })
      .lean()
      .limit(100); // Limit results for better performance

    const validRides = rides.filter(ride => ride.riderId);

    // --- THIS IS THE FIX ---
    // We will create a final, consistent data shape before sending.
    const finalRides = validRides.map(r => {
      // Prioritize the live gender from the populated user profile.
      // Fall back to the saved gender, then to an empty string.
      const reliableGender = r.riderId?.gender || r.riderGender || '';
      
      const seatsTaken = (r.confirmedRiders || []).reduce((sum, cr) => sum + (cr.seatCount || 1), 0);
      const seatsRemaining = (r.availableSeats || 1) - seatsTaken;

      return {
        ...r,
        riderGender: reliableGender, // Overwrite with the most reliable gender source.
        seatsRemaining: Math.max(0, seatsRemaining)
      };
    });

    // Cache the results for 5 minutes
    await cacheService.set(cacheKey, finalRides, 300);

    res.json(finalRides);
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
    // ... (query setup logic remains the same) ...
    const query = { /* ... */ };
    if (endLocation) query.endLocation = endLocation;
    
    const rides = await RideMatch.find(query)
      .populate('riderId', 'name email avatarUrl gender')
      .sort({ departureTime: 1 })
      .lean();

    const validRides = rides.filter(ride => ride.riderId);

    // --- THIS IS THE FIX ---
    // Apply the same consistent data shaping logic here.
    const finalRides = validRides.map(r => {
      const reliableGender = r.riderId?.gender || r.riderGender || '';
      const seatsTaken = (r.confirmedRiders || []).reduce((sum, cr) => sum + (cr.seatCount || 1), 0);
      const seatsRemaining = (r.availableSeats || 1) - seatsTaken;

      return {
        ...r,
        riderGender: reliableGender,
        seatsRemaining: Math.max(0, seatsRemaining)
      };
    });

    res.json(finalRides);
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
    
    // Fetch user data to get gender
    const user = await User.findById(effectiveRiderId).select('name email gender');
    console.log('=== Creating ride for user ===');
    console.log('User ID:', effectiveRiderId);
    console.log('User data:', user);
    console.log('User name:', user?.name);
    console.log('User gender:', user?.gender);
    console.log('User gender type:', typeof user?.gender);
    
    // Create a new ride offer with user data embedded
    const newRide = new RideMatch({
      riderId: effectiveRiderId,
      riderName: user?.name || 'Anonymous User',
      riderGender: user?.gender || '',
      departureTime: new Date(departureTime),
      startLocation,
      endLocation,
      recurring: recurring || null,
      status: 'pending',
      availableSeats: Number(availableSeats) || 1,
      requestedRiders: [],
      confirmedRiders: []
    });
    
    console.log('=== New ride object before save ===');
    console.log('riderName:', newRide.riderName);
    console.log('riderGender:', newRide.riderGender);
    console.log('riderGender type:', typeof newRide.riderGender);
    
    await newRide.save();
    
    console.log('=== Ride saved successfully ===');
    console.log('Saved ride riderName:', newRide.riderName);
    console.log('Saved ride riderGender:', newRide.riderGender);
    
    // Invalidate rides cache when new ride is created
    await cacheService.invalidateRides();
    
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
    
    // Fetch user data to get gender
    const user = await User.findById(effectiveRiderId).select('name email gender');
    console.log('Creating recurring rides for user:', {
      userId: effectiveRiderId,
      userName: user?.name,
      userGender: user?.gender
    });
    
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
          riderName: user?.name || 'Anonymous User',
          riderGender: user?.gender || '',
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
      .populate('riderId', 'name email avatarUrl')
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
      .populate('riderId', 'name email gender')
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
    const authUserId = (req.user && (req.user.id || req.user.userId)) || null;
    
    if (!rideId || !riderId || !score) {
      return res.status(400).json({ error: 'Missing rating data' });
    }
    if (score < 1 || score > 5) {
      return res.status(400).json({ error: 'Score must be between 1 and 5' });
    }

    const ride = await RideMatch.findById(rideId);
    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    const ownerId = ride.riderId.toString();
    const isOwner = ownerId === authUserId;
    const confirmedIds = (ride.confirmedRiders || []).map(cr => (cr.user._id ? cr.user._id.toString() : cr.user.toString()));
    const isConfirmedPassenger = confirmedIds.includes(authUserId);

    // Direction rules
    if (isOwner) {
      // Owner can rate confirmed riders only
      if (!confirmedIds.includes(riderId)) {
        return res.status(403).json({ error: 'Owner can rate confirmed riders only' });
      }
    } else if (isConfirmedPassenger) {
      // Passenger can rate owner only
      if (riderId !== ownerId) {
        return res.status(403).json({ error: 'Passengers can only rate the ride owner' });
      }
    } else {
      return res.status(403).json({ error: 'Only ride participants can rate' });
    }

    // Prevent duplicate from same rater about same target
    const alreadyRated = (ride.ratings || []).some(r => r.riderId.toString() === riderId && r.raterId && r.raterId.toString() === authUserId);
    if (alreadyRated) {
      return res.status(400).json({ error: 'You have already rated this user for this ride' });
    }

    if (!ride.ratings) ride.ratings = [];
    ride.ratings.push({ riderId, raterId: authUserId, score: Number(score), comment: comment || '' });
    await ride.save();

    return res.json({ message: 'Rating submitted', ratings: ride.ratings });
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
    
    console.log('🎯 AI Match request received:', { startLocation, endLocation, departureTime });
    
    if (!startLocation || !departureTime) {
      console.log('❌ Missing required parameters');
      return res.status(400).json({ error: 'Missing match parameters' });
    }
    
    // Debug: Check what's in the database
    const totalRides = await RideMatch.countDocuments();
    const pendingRides = await RideMatch.countDocuments({ status: 'pending' });
    console.log(`📊 Database stats: ${totalRides} total rides, ${pendingRides} pending rides`);
    
    const matches = await aiMatch({
      startLocation,
      endLocation: endLocation || '',
      departureTime
    });
    
    console.log(`✅ AI Match completed: ${matches.length} matches found`);
    res.json(matches);
  } catch (err) {
    console.error('❌ AI match error:', err);
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

exports.getMyRidesCombined = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Offered rides (user is owner)
    const offered = await RideMatch.find({ riderId: userId })
      .populate({ path: 'confirmedRiders.user', select: 'name email avatarUrl' })
      .lean();

    // Joined rides (user is confirmed passenger)
    const joined = await RideMatch.find({ 'confirmedRiders.user': userId })
      .populate({ path: 'riderId', select: 'name email avatarUrl' })
      .lean();

    // Requested rides (user requested but not confirmed)
    const requested = await RideMatch.find({ 'requestedRiders.user': userId })
      .populate({ path: 'riderId', select: 'name email avatarUrl' })
      .lean();

    res.json({ offered, joined, requested });
  } catch (err) {
    console.error('Error fetching my rides combined:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch rides' });
  }
};

/**
 * Cleanup orphaned notifications
 */
exports.cleanupNotifications = async (req, res) => {
  try {
    const rideNotificationService = require('../services/rideNotificationService');
    const deletedCount = await rideNotificationService.cleanupOrphanedNotifications();
    res.json({ message: `Cleanup complete. Deleted ${deletedCount} orphaned notifications.` });
  } catch (error) {
    console.error('Error during notification cleanup:', error);
    res.status(500).json({ error: 'Failed to cleanup notifications' });
  }
};