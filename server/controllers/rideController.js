// server/controllers/rideController.js - Merged implementation
const RideMatch = require('../models/RideMatch');
const { aiMatch } = require('../services/aiMatcher');
const { validateRideOffer, validateRecurringRide } = require('../utils/validate');

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
    const { rideId, userId } = req.body;
    
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
    if (ride.requestedRiders.includes(effectiveUserId)) {
      return res.status(400).json({ error: "You have already requested this ride" });
    }
    
    // Check if already confirmed
    if (ride.confirmedRiders.includes(effectiveUserId)) {
      return res.status(400).json({ error: "You are already confirmed for this ride" });
    }
    
    ride.requestedRiders.push(effectiveUserId);
    await ride.save();
    
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
    const alreadyConfirmed = ride.confirmedRiders.includes(userId);
    if (alreadyConfirmed) {
      return res.status(400).json({ error: "User already confirmed" });
    }
    
    // Remove from requested list if exists
    ride.requestedRiders = ride.requestedRiders.filter(id => id.toString() !== userId);
    ride.confirmedRiders.push(userId);
    
    // Mark ride as "confirmed" if 1st person joins
    if (ride.confirmedRiders.length === 1) {
      ride.status = "confirmed";
    }
    
    await ride.save();
    
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
    ride.requestedRiders = ride.requestedRiders.filter(id => id.toString() !== userId);
    
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