exports.validateRideOffer = (data) => {
  const { riderId, departureTime, startLocation, endLocation } = data;
  if (!riderId || !departureTime || !startLocation || !endLocation) {
    return "Missing required ride offer fields.";
  }
  return null;
};

exports.validateRecurringRide = (data) => {
  const { riderId, startLocation, endLocation, recurring } = data;
  if (!riderId || !startLocation || !endLocation) return "Missing ride basics.";
  if (!recurring || !recurring.days || !recurring.frequency) return "Incomplete recurring info.";
  return null;
};
