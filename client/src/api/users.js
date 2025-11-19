import { vi } from 'vitest';

// Mock API functions for testing
export const getUserById = vi.fn(async (userId) => {
  return { data: { _id: userId, name: 'Test User', email: 'test@example.com' } };
});