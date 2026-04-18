import { renderHook, act } from '@testing-library/react';
import { vi } from 'vitest';
import { useChatData } from '../../hooks/useChatData';

vi.mock('../../api/chat', () => ({
  getAllChats: vi.fn(),
  getChatMessages: vi.fn(),
  sendNewMessage: vi.fn(),
  clearUnreadMessages: vi.fn()
}));

vi.mock('../../api/users', () => ({
  getUserById: vi.fn().mockResolvedValue({ data: { _id: 'u2', name: 'User 2' } })
}));

describe('useChatData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.setItem('userId', 'u1');
    localStorage.removeItem('chatList_u1');
  });

  it('starts with safe defaults', () => {
    const { result } = renderHook(() => useChatData());
    expect(result.current.chats).toEqual([]);
    expect(result.current.messages).toEqual([]);
    expect(result.current.error).toBe('');
  });

  it('updates draft for selected chat', async () => {
    const { result } = renderHook(() => useChatData());
    await act(async () => {
      result.current.updateCurrentDraft({ _id: 'c1' }, 'hello');
    });

    expect(result.current.getCurrentDraft({ _id: 'c1' })).toBe('hello');
  });
});
