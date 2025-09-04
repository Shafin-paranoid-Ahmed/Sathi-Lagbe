const RideMatch = require('../models/RideMatch');

// Simple fuzzy-match helper
const fuzzyMatch = (a = '', b = '') =>
  a.toLowerCase().includes(b.toLowerCase()) || b.toLowerCase().includes(a.toLowerCase());

async function aiMatch({ startLocation, endLocation, departureTime }) {
  // 1. Fetch all pending rides (status = 'pending')
  const candidates = await RideMatch.find({ status: 'pending' })
    .populate('riderId', 'name email avatarUrl gender') // Already correctly asks for gender
    .lean();

  // Filter out rides without valid riderId
  const validCandidates = candidates.filter(r => r.riderId && r.riderId._id);
  if (validCandidates.length === 0) {
    return [];
  }

  const desiredTime = new Date(departureTime);

  // 2. Score each candidate
  const scored = validCandidates.map(r => {
    let score = 0;

    // Time proximity
    const diffMins = Math.abs(new Date(r.departureTime) - desiredTime) / 1000 / 60;
    score += Math.max(0, 100 - diffMins * 2);

    // Route overlap
    if (fuzzyMatch(r.startLocation, startLocation)) score += 20;
    if (fuzzyMatch(r.endLocation, endLocation))     score += 20;

    // Average partner rating
    const ratings = r.ratings || [];
    if (ratings.length) {
      const avg = ratings.reduce((sum, rr) => sum + rr.score, 0) / ratings.length;
      score += avg * 10;
    }

    const finalScore = Math.min(100, Math.round(score));

    // --- THIS IS THE FIX ---
    // Ensure the top-level riderGender is consistent with the populated data.
    const finalRideObject = {
      ...r,
      riderGender: r.riderId?.gender || r.riderGender || '', // Prioritize live data from populate
      matchScore: finalScore
    };
    
    return finalRideObject;
  });

  // 3. Sort by descending score
  scored.sort((a, b) => b.matchScore - a.matchScore);

  return scored;
}

module.exports = { aiMatch };