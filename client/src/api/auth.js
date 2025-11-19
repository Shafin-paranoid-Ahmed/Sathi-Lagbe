import { vi } from 'vitest';

// Mock API functions for testing
export const verifyToken = vi.fn(async (token) => {
  return { data: { success: true, user: { _id: 'user123' } } };
});

export const updateStatus = vi.fn(async (statusData) => {
  return { data: { success: true } };
});

export const getCurrentUserStatus = vi.fn(async () => {
  return { data: { status: 'available' } };
});

export const logout = vi.fn(async () => {
  return { data: { success: true } };
});