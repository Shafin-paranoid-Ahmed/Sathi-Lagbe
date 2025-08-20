// server/controllers/rideController.js - Merged implementation
const RideMatch = require('../models/RideMatch');
const { aiMatch } = require('../services/aiMatcher');
const { validateRideOffer, validateRecurringRide } = require('../utils/validate');
const rideNotificationService = require('../services/rideNotificationService');

/**
 * Search for ride matches
 */
exports.findRideMatches = async (req, res) => {
  try {
    // Get query parameters
    const { departureTime, startLocation, endLocation } = req.query;
    
    // Check required fields
    if (!departureTime || !startLocation) {
      return res.status(400).json({ error: 'Missing departureTime or startLocation' });
    }
    
    // Convert departureTime string to a Date object
    const targetTime = new Date(departureTime);
    
    // Define a time window (±30 minutes)
    const startTime = new Date(targetTime.getTime() - 30 * 60000); // 30 mins before
    const endTime = new Date(targetTime.getTime() + 30 * 60000); // 30 mins after
    
    // Build query
    const query = {
      departureTime: { $gte: startTime, $lte: endTime },
      startLocation: startLocation,
      status: { $ne: 'completed' } // Exclude completed rides
    };
    
    // Add endLocation if provided
    if (endLocation) {
      query.endLocation = endLocation;
    }
    
    // Query the database
    const rides = await RideMatch.find(query)
      .sort({ departureTime: 1 }); // Sort by earliest departure
      
    // Send the results
    res.json(rides);
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
    
    const { riderId, departureTime, startLocation, endLocation, recurring } = req.body;
    
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
    
    // Check if user is the ride creator
    if (ride.riderId.toString() === effectiveUserId.toString()) {
      return res.status(400).json({ error: "You can't join your own ride" });
    }
    
    // Check if already requested
    if (ride.requestedRiders.some(r => r.toString() === effectiveUserId.toString())) {
      return res.status(400).json({ error: "You have already requested this ride" });
    }
    
    // Check if already confirmed
    if (ride.confirmedRiders.some(r => r.toString() === effectiveUserId.toString())) {
      return res.status(400).json({ error: "You are already confirmed for this ride" });
    }
    
    ride.requestedRiders.push({ user: effectiveUserId, seatCount });
    await ride.save();
    
    // Send notification to ride owner about the request
    try {
      await rideNotificationService.sendRideInvitation(rideId, ride.riderId, [effectiveUserId]);
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
    const { rideId, userId } = req.body;
    const ride = await RideMatch.findById(rideId);
    
    if (!ride) {
      return res.status(404).json({ error: "Ride not found" });
    }
    
    // Check if the requester is authorized (ride owner)
    const requesterId = req.user.id || req.user.userId;
    if (ride.riderId.toString() !== requesterId.toString()) {
      return res.status(403).json({ error: "Only the ride creator can confirm requests" });
    }
    
    // Check if already confirmed
    const alreadyConfirmed = ride.confirmedRiders.some(r => r.toString() === userId);
    if (alreadyConfirmed) {
      return res.status(400).json({ error: "User already confirmed" });
    }
    
    // Find the request
    const reqIndex = ride.requestedRiders.findIndex(r => r.toString() === userId);
    if (reqIndex === -1) {
      return res.status(404).json({ error: "Request not found" });
    }

    const [riderReq] = ride.requestedRiders.splice(reqIndex, 1);
    ride.confirmedRiders.push(riderReq);
    
    // Mark ride as "confirmed" if 1st person joins
    if (ride.confirmedRiders.length === 1) {
      ride.status = "confirmed";
    }
    
    await ride.save();
    
    // Send confirmation notification to the confirmed user
    try {
      await rideNotificationService.sendRideConfirmation(rideId, userId, requesterId);
    } catch (notificationError) {
      console.error('Error sending ride confirmation notification:', notificationError);
    }
    
    res.json({
      message: "Rider confirmed",
      ride
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
    ride.requestedRiders = ride.requestedRiders.filter(r => r.toString() !== userId);
    
    await ride.save();
    
    res.json({
      message: "Request denied",
      ride
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
    const ride = await RideMatch.findById(req.params.rideId)
      .populate('requestedRiders', 'name email')
      .populate('confirmedRiders', 'name email');
      
    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }
    
    res.json(ride);
  } catch (err) {
    console.error('Error getting ride:', err);
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
      .populate('confirmedRiders', 'name email')
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
    
    res.json({ message: 'Ride deleted' });
  } catch (err) {
    console.error('Error deleting ride:', err);
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
    const isConfirmed = ride.confirmedRiders.some(id => id.toString() === riderId);
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
    const isPassenger = ride.confirmedRiders.some(r => r.user.toString() === userId);
    
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
    const isPassenger = ride.confirmedRiders.some(r => r.user.toString() === userId);
    
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