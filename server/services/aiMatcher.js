// services/aiMatcher.js
const RideMatch = require('../models/RideMatch');

// --- SCORING CONFIGURATION ---
// We define the importance of each factor as a weight. Together they must add up to 1.0.
// This gives us precise control over the AI's priorities.
const WEIGHTS = {
  TIME: 0.40,           // 40% of the final score is based on how close the time is.
  START_LOCATION: 0.25, // 25% is based on the pickup location.
  END_LOCATION: 0.30,   // 30% is based on the destination (making it more important than the start).
  RIDER_RATING: 0.05,   // 5% is based on the driver's past ratings.
};

/**
 * A more intelligent location match than a simple 'includes'.
 * It returns a score from 0 to 100 based on word overlap.
 * Example: "Mohakhali DOHS" vs "DOHS" will get a good score.
 */
const calculateLocationScore = (searchLocation = '', rideLocation = '') => {
  const search = searchLocation.toLowerCase().trim();
  const ride = rideLocation.toLowerCase().trim();

  if (!search || !ride) return 0;
  if (search === ride) return 100;

  const searchTokens = search.split(/\s+/);
  const rideTokens = ride.split(/\s+/);
  const commonTokens = searchTokens.filter(token => rideTokens.includes(token));
  
  if (searchTokens.length === 0) return 0;
  // Score is based on how many of the user's search terms were found in the ride's location.
  return (commonTokens.length / searchTokens.length) * 100;
};


async function aiMatch({ startLocation, endLocation, departureTime }) {
  const candidates = await RideMatch.find({ status: 'pending' })
    .populate('riderId', 'name email avatarUrl gender')
    .lean();

  const validCandidates = candidates.filter(r => r.riderId && r.riderId._id);
  if (validCandidates.length === 0) {
    return [];
  }

  const desiredTime = new Date(departureTime);

  const scored = validCandidates.map(r => {
    // --- STEP 1: Normalize all factors to a 0-100 scale ---

    // a) Time Score (0-100)
    const diffMins = Math.abs(new Date(r.departureTime) - desiredTime) / 1000 / 60;
    const timeScore = Math.max(0, 100 - diffMins * 2);

    // b) Start Location Score (0-100)
    const startScore = calculateLocationScore(startLocation, r.startLocation);

    // c) End Location Score (0-100)
    // If the user didn't specify an end location, we treat it as a perfect match for all rides.
    const endScore = endLocation ? calculateLocationScore(endLocation, r.endLocation) : 100;

    // d) Rider Rating Score (0-100)
    let ratingScore = 75; // Give a good default score to new users without ratings.
    const ratings = r.ratings || [];
    if (ratings.length > 0) {
      const avg = ratings.reduce((sum, rr) => sum + rr.score, 0) / ratings.length;
      ratingScore = (avg / 5) * 100; // Convert 1-5 star scale to 0-100.
    }

    // --- STEP 2: Calculate the final weighted score ---
    const finalScore = 
      (timeScore * WEIGHTS.TIME) +
      (startScore * WEIGHTS.START_LOCATION) +
      (endScore * WEIGHTS.END_LOCATION) +
      (ratingScore * WEIGHTS.RIDER_RATING);

    // Ensure gender data is consistent for the frontend filter.
    const reliableGender = r.riderId?.gender || r.riderGender || '';

    return { 
      ...r, 
      riderGender: reliableGender,
      matchScore: Math.round(finalScore) 
    };
  });

  // 3. Sort by the final, weighted score
  scored.sort((a, b) => b.matchScore - a.matchScore);

  return scored;
}

module.exports = { aiMatch };