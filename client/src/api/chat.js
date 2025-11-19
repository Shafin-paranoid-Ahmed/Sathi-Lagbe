import { vi } from 'vitest';

// Mock API functions for testing
export const getAllChats = vi.fn(async () => {
  return { data: [] };
});

export const getChatMessages = vi.fn(async (chatId) => {
  return { data: [] };
});

export const sendNewMessage = vi.fn(async (chatId, message) => {
  return { data: { success: true, message: { _id: 'msg123', text: message } } };
});

export const clearUnreadMessages = vi.fn(async (chatId) => {
  return { data: { success: true } };
});