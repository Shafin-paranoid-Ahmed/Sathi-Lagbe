const Chat = require('../../../models/chat');

describe('Chat Model', () => {
  describe('Chat Creation', () => {
    it('should create a chat with valid data', async () => {
      const chatData = {
        members: [
          global.testUtils.createObjectId(),
          global.testUtils.createObjectId()
        ],
        unreadMessageCount: 0
      };

      const chat = new Chat(chatData);
      await chat.save();

      expect(chat._id).toBeDefined();
      expect(chat.members).toEqual(chatData.members);
      expect(chat.unreadMessageCount).toBe(chatData.unreadMessageCount);
      expect(chat.lastMessage).toBeUndefined();
    });

    it('should create a chat with default values', async () => {
      const chatData = {
        members: [
          global.testUtils.createObjectId(),
          global.testUtils.createObjectId()
        ]
      };

      const chat = new Chat(chatData);
      await chat.save();

      expect(chat.unreadMessageCount).toBe(0);
      expect(chat.lastMessage).toBeUndefined();
    });

    it('should require members field', async () => {
      const chatData = {
        unreadMessageCount: 0
      };

      const chat = new Chat(chatData);
      await expect(chat.save()).rejects.toThrow();
    });

    it('should require at least one member', async () => {
      const chatData = {
        members: [],
        unreadMessageCount: 0
      };

      const chat = new Chat(chatData);
      await expect(chat.save()).rejects.toThrow();
    });

    it('should accept valid unreadMessageCount values', async () => {
      const validCounts = [0, 1, 5, 10, 100];
      
      for (const count of validCounts) {
        const chatData = {
          members: [
            global.testUtils.createObjectId(),
            global.testUtils.createObjectId()
          ],
          unreadMessageCount: count
        };

        const chat = new Chat(chatData);
        await expect(chat.save()).resolves.toBeDefined();
      }
    });

    it('should accept negative unreadMessageCount', async () => {
      const chatData = {
        members: [
          global.testUtils.createObjectId(),
          global.testUtils.createObjectId()
        ],
        unreadMessageCount: -1
      };

      const chat = new Chat(chatData);
      await expect(chat.save()).resolves.toBeDefined();
    });

    it('should accept lastMessage reference', async () => {
      const messageId = global.testUtils.createObjectId();
      const chatData = {
        members: [
          global.testUtils.createObjectId(),
          global.testUtils.createObjectId()
        ],
        lastMessage: messageId,
        unreadMessageCount: 1
      };

      const chat = new Chat(chatData);
      await chat.save();

      expect(chat.lastMessage).toEqual(messageId);
    });
  });

  describe('Chat Methods', () => {
    let chat;

    beforeEach(async () => {
      chat = await global.testUtils.createTestChat();
    });

    it('should add a member to the chat', async () => {
      const newMemberId = global.testUtils.createObjectId();
      
      chat.members.push(newMemberId);
      await chat.save();

      expect(chat.members).toContain(newMemberId);
      expect(chat.members).toHaveLength(3);
    });

    it('should remove a member from the chat', async () => {
      const memberToRemove = chat.members[0];
      
      chat.members = chat.members.filter(member => !member.equals(memberToRemove));
      await chat.save();

      expect(chat.members).not.toContain(memberToRemove);
      expect(chat.members).toHaveLength(1);
    });

    it('should update unread message count', async () => {
      const newCount = 5;
      
      chat.unreadMessageCount = newCount;
      await chat.save();

      expect(chat.unreadMessageCount).toBe(newCount);
    });

    it('should increment unread message count', async () => {
      const originalCount = chat.unreadMessageCount;
      
      chat.unreadMessageCount += 1;
      await chat.save();

      expect(chat.unreadMessageCount).toBe(originalCount + 1);
    });

    it('should decrement unread message count', async () => {
      chat.unreadMessageCount = 5;
      await chat.save();
      
      chat.unreadMessageCount -= 1;
      await chat.save();

      expect(chat.unreadMessageCount).toBe(4);
    });

    it('should reset unread message count to zero', async () => {
      chat.unreadMessageCount = 10;
      await chat.save();
      
      chat.unreadMessageCount = 0;
      await chat.save();

      expect(chat.unreadMessageCount).toBe(0);
    });

    it('should update last message reference', async () => {
      const newMessageId = global.testUtils.createObjectId();
      
      chat.lastMessage = newMessageId;
      await chat.save();

      expect(chat.lastMessage).toEqual(newMessageId);
    });

    it('should clear last message reference', async () => {
      chat.lastMessage = global.testUtils.createObjectId();
      await chat.save();
      
      chat.lastMessage = null;
      await chat.save();

      expect(chat.lastMessage).toBeNull();
    });
  });

  describe('Chat Validation', () => {
    it('should validate members array contains ObjectIds', async () => {
      const chatData = {
        members: [
          'invalid-id',
          global.testUtils.createObjectId()
        ]
      };

      const chat = new Chat(chatData);
      await expect(chat.save()).rejects.toThrow();
    });

    it('should validate lastMessage is ObjectId when provided', async () => {
      const chatData = {
        members: [
          global.testUtils.createObjectId(),
          global.testUtils.createObjectId()
        ],
        lastMessage: 'invalid-message-id'
      };

      const chat = new Chat(chatData);
      await expect(chat.save()).rejects.toThrow();
    });

    it('should accept null lastMessage', async () => {
      const chatData = {
        members: [
          global.testUtils.createObjectId(),
          global.testUtils.createObjectId()
        ],
        lastMessage: null
      };

      const chat = new Chat(chatData);
      await expect(chat.save()).resolves.toBeDefined();
    });
  });

  describe('Chat Timestamps', () => {
    it('should have createdAt and updatedAt timestamps', async () => {
      const chat = await global.testUtils.createTestChat();
      
      expect(chat.createdAt).toBeDefined();
      expect(chat.updatedAt).toBeDefined();
      expect(chat.createdAt).toBeInstanceOf(Date);
      expect(chat.updatedAt).toBeInstanceOf(Date);
    });

    it('should update updatedAt on save', async () => {
      const chat = await global.testUtils.createTestChat();
      const originalUpdatedAt = chat.updatedAt;
      
      // Wait a bit to ensure time difference
      await new Promise(resolve => setTimeout(resolve, 10));
      
      chat.unreadMessageCount = 5;
      await chat.save();
      
      expect(chat.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe('Chat Queries', () => {
    let chat1, chat2, chat3;

    beforeEach(async () => {
      const user1 = global.testUtils.createObjectId();
      const user2 = global.testUtils.createObjectId();
      const user3 = global.testUtils.createObjectId();

      chat1 = new Chat({
        members: [user1, user2],
        unreadMessageCount: 0
      });
      await chat1.save();

      chat2 = new Chat({
        members: [user1, user3],
        unreadMessageCount: 3
      });
      await chat2.save();

      chat3 = new Chat({
        members: [user2, user3],
        unreadMessageCount: 1
      });
      await chat3.save();
    });

    it('should find chats by member', async () => {
      const user1 = chat1.members[0];
      const chats = await Chat.find({ members: user1 });
      
      expect(chats).toHaveLength(2);
      expect(chats.map(c => c._id.toString())).toContain(chat1._id.toString());
      expect(chats.map(c => c._id.toString())).toContain(chat2._id.toString());
    });

    it('should find chats with unread messages', async () => {
      const chats = await Chat.find({ unreadMessageCount: { $gt: 0 } });
      
      expect(chats).toHaveLength(2);
      expect(chats.map(c => c._id.toString())).toContain(chat2._id.toString());
      expect(chats.map(c => c._id.toString())).toContain(chat3._id.toString());
    });

    it('should find chats without unread messages', async () => {
      const chats = await Chat.find({ unreadMessageCount: 0 });
      
      expect(chats).toHaveLength(1);
      expect(chats[0]._id.toString()).toBe(chat1._id.toString());
    });

    it('should sort chats by updatedAt descending', async () => {
      const chats = await Chat.find().sort({ updatedAt: -1 });
      
      expect(chats).toHaveLength(3);
      expect(chats[0].updatedAt.getTime()).toBeGreaterThanOrEqual(chats[1].updatedAt.getTime());
      expect(chats[1].updatedAt.getTime()).toBeGreaterThanOrEqual(chats[2].updatedAt.getTime());
    });
  });
});
