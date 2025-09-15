import { renderHook, act } from '@testing-library/react';
import { useChatData } from '../../hooks/useChatData';

// Mock the API functions
jest.mock('../../api/chat', () => ({
  getAllChats: jest.fn(),
  getChatMessages: jest.fn(),
  sendNewMessage: jest.fn(),
  clearUnreadMessages: jest.fn()
}));

jest.mock('../../api/users', () => ({
  getUserById: jest.fn()
}));

// Mock sessionStorage and localStorage
const mockSessionStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};

const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage
});

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

describe('useChatData', () => {
  const mockGetAllChats = require('../../api/chat').getAllChats;
  const mockGetChatMessages = require('../../api/chat').getChatMessages;
  const mockSendNewMessage = require('../../api/chat').sendNewMessage;
  const mockClearUnreadMessages = require('../../api/chat').clearUnreadMessages;
  const mockGetUserById = require('../../api/users').getUserById;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSessionStorage.getItem.mockReturnValue('user123');
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  it('should initialize with empty state when no saved data', () => {
    const { result } = renderHook(() => useChatData());

    expect(result.current.chats).toEqual([]);
    expect(result.current.messages).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('');
  });

  it('should initialize with saved chats from localStorage', () => {
    const savedChats = [
      { _id: 'chat1', members: ['user1', 'user2'] },
      { _id: 'chat2', members: ['user1', 'user3'] }
    ];
    mockLocalStorage.getItem.mockReturnValue(JSON.stringify(savedChats));

    const { result } = renderHook(() => useChatData());

    expect(result.current.chats).toEqual(savedChats);
  });

  it('should handle localStorage parse error gracefully', () => {
    mockLocalStorage.getItem.mockReturnValue('invalid json');

    const { result } = renderHook(() => useChatData());

    expect(result.current.chats).toEqual([]);
  });

  it('should load chats on mount', async () => {
    const mockChats = [
      { _id: 'chat1', members: ['user1', 'user2'], lastMessage: null },
      { _id: 'chat2', members: ['user1', 'user3'], lastMessage: null }
    ];
    mockGetAllChats.mockResolvedValue({ data: mockChats });

    const { result } = renderHook(() => useChatData());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(mockGetAllChats).toHaveBeenCalled();
    expect(result.current.chats).toEqual(mockChats);
  });

  it('should handle chat loading error', async () => {
    mockGetAllChats.mockRejectedValue(new Error('Failed to load chats'));

    const { result } = renderHook(() => useChatData());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.chatError).toBe('Failed to load chats');
  });

  it('should load messages for selected chat', async () => {
    const mockMessages = [
      { _id: 'msg1', text: 'Hello', sender: 'user1' },
      { _id: 'msg2', text: 'Hi there', sender: 'user2' }
    ];
    mockGetChatMessages.mockResolvedValue({ data: mockMessages });

    const { result } = renderHook(() => useChatData());

    await act(async () => {
      result.current.loadMessages('chat1');
    });

    expect(mockGetChatMessages).toHaveBeenCalledWith('chat1');
    expect(result.current.messages).toEqual(mockMessages);
  });

  it('should handle message loading error', async () => {
    mockGetChatMessages.mockRejectedValue(new Error('Failed to load messages'));

    const { result } = renderHook(() => useChatData());

    await act(async () => {
      result.current.loadMessages('chat1');
    });

    expect(result.current.error).toBe('Failed to load messages');
  });

  it('should send a message successfully', async () => {
    const mockMessage = { _id: 'msg1', text: 'Hello', sender: 'user123' };
    mockSendNewMessage.mockResolvedValue({ data: { success: true, message: mockMessage } });

    const { result } = renderHook(() => useChatData());

    await act(async () => {
      result.current.sendMessage('chat1', 'Hello');
    });

    expect(mockSendNewMessage).toHaveBeenCalledWith('chat1', 'Hello');
    expect(result.current.messages).toContain(mockMessage);
  });

  it('should handle send message error', async () => {
    mockSendNewMessage.mockRejectedValue(new Error('Failed to send message'));

    const { result } = renderHook(() => useChatData());

    await act(async () => {
      result.current.sendMessage('chat1', 'Hello');
    });

    expect(result.current.error).toBe('Failed to send message');
  });

  it('should clear unread messages', async () => {
    mockClearUnreadMessages.mockResolvedValue({ data: { success: true } });

    const { result } = renderHook(() => useChatData());

    await act(async () => {
      result.current.clearUnreadMessages('chat1');
    });

    expect(mockClearUnreadMessages).toHaveBeenCalledWith('chat1');
  });

  it('should handle clear unread messages error', async () => {
    mockClearUnreadMessages.mockRejectedValue(new Error('Failed to clear messages'));

    const { result } = renderHook(() => useChatData());

    await act(async () => {
      result.current.clearUnreadMessages('chat1');
    });

    expect(result.current.error).toBe('Failed to clear messages');
  });

  it('should manage drafts correctly', () => {
    const { result } = renderHook(() => useChatData());

    const selectedChat = { _id: 'chat1' };

    act(() => {
      result.current.updateCurrentDraft(selectedChat, 'Hello world');
    });

    expect(result.current.getCurrentDraft(selectedChat)).toBe('Hello world');

    act(() => {
      result.current.updateCurrentDraft(selectedChat, 'Updated message');
    });

    expect(result.current.getCurrentDraft(selectedChat)).toBe('Updated message');
  });

  it('should return empty draft for null selected chat', () => {
    const { result } = renderHook(() => useChatData());

    expect(result.current.getCurrentDraft(null)).toBe('');
  });

  it('should load user profiles for chat members', async () => {
    const mockUser1 = { _id: 'user1', name: 'User One', avatarUrl: 'avatar1.jpg' };
    const mockUser2 = { _id: 'user2', name: 'User Two', avatarUrl: 'avatar2.jpg' };
    
    mockGetUserById
      .mockResolvedValueOnce({ data: mockUser1 })
      .mockResolvedValueOnce({ data: mockUser2 });

    const mockChats = [
      { _id: 'chat1', members: ['user1', 'user2'] }
    ];

    const { result } = renderHook(() => useChatData());

    await act(async () => {
      result.current.loadUserProfiles(mockChats);
    });

    expect(mockGetUserById).toHaveBeenCalledWith('user1');
    expect(mockGetUserById).toHaveBeenCalledWith('user2');
    expect(result.current.userProfiles).toEqual({
      user1: mockUser1,
      user2: mockUser2
    });
  });

  it('should handle user profile loading error', async () => {
    mockGetUserById.mockRejectedValue(new Error('Failed to load user'));

    const mockChats = [
      { _id: 'chat1', members: ['user1'] }
    ];

    const { result } = renderHook(() => useChatData());

    await act(async () => {
      result.current.loadUserProfiles(mockChats);
    });

    expect(result.current.error).toBe('Failed to load user');
  });

  it('should not load profiles for already loaded users', async () => {
    const mockUser1 = { _id: 'user1', name: 'User One' };
    const mockUser2 = { _id: 'user2', name: 'User Two' };
    
    mockGetUserById.mockResolvedValue({ data: mockUser2 });

    const mockChats = [
      { _id: 'chat1', members: ['user1', 'user2'] }
    ];

    const { result } = renderHook(() => useChatData());

    // Set initial user profiles
    act(() => {
      result.current.setUserProfiles({ user1: mockUser1 });
    });

    await act(async () => {
      result.current.loadUserProfiles(mockChats);
    });

    // Should only load user2, not user1
    expect(mockGetUserById).toHaveBeenCalledTimes(1);
    expect(mockGetUserById).toHaveBeenCalledWith('user2');
  });

  it('should cache messages for different chats', async () => {
    const mockMessages1 = [{ _id: 'msg1', text: 'Hello from chat1' }];
    const mockMessages2 = [{ _id: 'msg2', text: 'Hello from chat2' }];

    mockGetChatMessages
      .mockResolvedValueOnce({ data: mockMessages1 })
      .mockResolvedValueOnce({ data: mockMessages2 });

    const { result } = renderHook(() => useChatData());

    // Load messages for chat1
    await act(async () => {
      result.current.loadMessages('chat1');
    });

    expect(result.current.messages).toEqual(mockMessages1);

    // Load messages for chat2
    await act(async () => {
      result.current.loadMessages('chat2');
    });

    expect(result.current.messages).toEqual(mockMessages2);

    // Switch back to chat1
    await act(async () => {
      result.current.loadMessages('chat1');
    });

    expect(result.current.messages).toEqual(mockMessages1);
  });

  it('should handle empty chat list', async () => {
    mockGetAllChats.mockResolvedValue({ data: [] });

    const { result } = renderHook(() => useChatData());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.chats).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('should handle network errors gracefully', async () => {
    mockGetAllChats.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useChatData());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.chatError).toBe('Network error');
    expect(result.current.loading).toBe(false);
  });
});