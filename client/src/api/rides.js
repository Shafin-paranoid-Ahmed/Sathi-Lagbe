import { vi } from 'vitest';

// Mock API functions for testing
export const createRideOffer = vi.fn(async (rideData) => {
  return { data: { success: true, ride: { _id: 'ride123' } } };
});

export const createRecurringRides = vi.fn(async (rideData) => {
  return { data: { success: true, rides: [{ _id: 'ride123' }] } };
});