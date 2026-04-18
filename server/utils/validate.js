exports.validateRideOffer = (data) => {
  const { departureTime, startLocation, endLocation } = data;
  if (!departureTime || !startLocation || !endLocation) {
    return "Missing required ride offer fields.";
  }
  return null;
};

exports.validateRecurringRide = (data) => {
  const { startLocation, endLocation, recurring } = data;
  if (!startLocation || !endLocation) return "Missing ride basics.";
  if (!recurring || !recurring.days || !recurring.frequency) return "Incomplete recurring info.";
  return null;
};
