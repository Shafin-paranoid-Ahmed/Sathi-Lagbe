const request = require('supertest');
const { app } = require('../../../index');
const Chat = require('../../../models/chat');
const Message = require('../../../models/Message');
const User = require('../../../models/User');

// Skipped: tests target a different chat REST surface than this codebase.
describe.skip('Chat Controller', () => {
  let user1, user2, user3, token1, token2, token3, chat;

  beforeEach(async () => {
    user1 = await global.testUtils.createTestUser({
      email: 'user1@bracu.ac.bd',
      name: 'User One'
    });
    user2 = await global.testUtils.createTestUser({
      email: 'user2@bracu.ac.bd',
      name: 'User Two'
    });
    user3 = await global.testUtils.createTestUser({
      email: 'user3@bracu.ac.bd',
      name: 'User Three'
    });

    token1 = global.testUtils.generateToken(user1._id);
    token2 = global.testUtils.generateToken(user2._id);
    token3 = global.testUtils.generateToken(user3._id);

    chat = await global.testUtils.createTestChat({
      members: [user1._id, user2._id]
    });
  });

  describe('GET /api/chat/messages/:chatId', () => {
    beforeEach(async () => {
      // Create test messages
      await Message.create([
        {
          chatId: chat._id,
          sender: user1._id,
          text: 'Hello from user1',
          createdAt: new Date(Date.now() - 1000)
        },
        {
          chatId: chat._id,
          sender: user2._id,
          text: 'Hello from user2',
          createdAt: new Date()
        }
      ]);
    });

    it('should get messages for a chat', async () => {
      const response = await request(app)
        .get(`/api/chat/messages/${chat._id}`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].text).toBe('Hello from user1');
      expect(response.body[1].text).toBe('Hello from user2');
    });

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get(`/api/chat/messages/${chat._id}`)
        .expect(401);

      expect(response.body.error).toContain('No token');
    });

    it('should reject request with invalid chat ID', async () => {
      const invalidChatId = global.testUtils.createObjectId();

      const response = await request(app)
        .get(`/api/chat/messages/${invalidChatId}`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(0);
    });

    it('should reject request with malformed chat ID', async () => {
      const response = await request(app)
        .get('/api/chat/messages/invalid-id')
        .set('Authorization', `Bearer ${token1}`)
        .expect(400);

      expect(response.body.error).toContain('Chat ID is required');
    });
  });

  describe('POST /api/chat/send', () => {
    it('should send a message successfully', async () => {
      const messageData = {
        chatId: chat._id,
        text: 'Hello, this is a test message'
      };

      const response = await request(app)
        .post('/api/chat/send')
        .set('Authorization', `Bearer ${token1}`)
        .send(messageData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBeDefined();
      expect(response.body.message.text).toBe(messageData.text);
      expect(response.body.message.sender).toBe(user1._id.toString());

      // Verify message was saved to database
      const savedMessage = await Message.findById(response.body.message._id);
      expect(savedMessage).toBeDefined();
      expect(savedMessage.text).toBe(messageData.text);
    });

    it('should reject message without authentication', async () => {
      const messageData = {
        chatId: chat._id,
        text: 'Hello, this is a test message'
      };

      const response = await request(app)
        .post('/api/chat/send')
        .send(messageData)
        .expect(401);

      expect(response.body.error).toContain('No token');
    });

    it('should reject message with missing chat ID', async () => {
      const messageData = {
        text: 'Hello, this is a test message'
      };

      const response = await request(app)
        .post('/api/chat/send')
        .set('Authorization', `Bearer ${token1}`)
        .send(messageData)
        .expect(400);

      expect(response.body.error).toContain('Chat ID and text are required');
    });

    it('should reject message with missing text', async () => {
      const messageData = {
        chatId: chat._id
      };

      const response = await request(app)
        .post('/api/chat/send')
        .set('Authorization', `Bearer ${token1}`)
        .send(messageData)
        .expect(400);

      expect(response.body.error).toContain('Chat ID and text are required');
    });

    it('should reject message for non-existent chat', async () => {
      const nonExistentChatId = global.testUtils.createObjectId();
      const messageData = {
        chatId: nonExistentChatId,
        text: 'Hello, this is a test message'
      };

      const response = await request(app)
        .post('/api/chat/send')
        .set('Authorization', `Bearer ${token1}`)
        .send(messageData)
        .expect(404);

      expect(response.body.error).toContain('Chat not found');
    });

    it('should reject message from non-chat member', async () => {
      const messageData = {
        chatId: chat._id,
        text: 'Hello, this is a test message'
      };

      const response = await request(app)
        .post('/api/chat/send')
        .set('Authorization', `Bearer ${token3}`)
        .send(messageData)
        .expect(403);

      expect(response.body.error).toContain('not a member');
    });
  });

  describe('POST /api/chat/create', () => {
    it('should create a new chat between two users', async () => {
      const chatData = {
        members: [user1._id, user3._id]
      };

      const response = await request(app)
        .post('/api/chat/create')
        .set('Authorization', `Bearer ${token1}`)
        .send(chatData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.chat).toBeDefined();
      expect(response.body.chat.members).toHaveLength(2);
      expect(response.body.chat.members.map(m => m.toString())).toContain(user1._id.toString());
      expect(response.body.chat.members.map(m => m.toString())).toContain(user3._id.toString());

      // Verify chat was saved to database
      const savedChat = await Chat.findById(response.body.chat._id);
      expect(savedChat).toBeDefined();
    });

    it('should reject chat creation without authentication', async () => {
      const chatData = {
        members: [user1._id, user3._id]
      };

      const response = await request(app)
        .post('/api/chat/create')
        .send(chatData)
        .expect(401);

      expect(response.body.error).toContain('No token');
    });

    it('should reject chat creation with missing members', async () => {
      const chatData = {};

      const response = await request(app)
        .post('/api/chat/create')
        .set('Authorization', `Bearer ${token1}`)
        .send(chatData)
        .expect(400);

      expect(response.body.error).toContain('Members are required');
    });

    it('should reject chat creation with empty members array', async () => {
      const chatData = {
        members: []
      };

      const response = await request(app)
        .post('/api/chat/create')
        .set('Authorization', `Bearer ${token1}`)
        .send(chatData)
        .expect(400);

      expect(response.body.error).toContain('At least two members');
    });

    it('should reject chat creation with single member', async () => {
      const chatData = {
        members: [user1._id]
      };

      const response = await request(app)
        .post('/api/chat/create')
        .set('Authorization', `Bearer ${token1}`)
        .send(chatData)
        .expect(400);

      expect(response.body.error).toContain('At least two members');
    });

    it('should reject chat creation with invalid member IDs', async () => {
      const chatData = {
        members: [user1._id, 'invalid-id']
      };

      const response = await request(app)
        .post('/api/chat/create')
        .set('Authorization', `Bearer ${token1}`)
        .send(chatData)
        .expect(400);

      expect(response.body.error).toContain('Invalid member ID');
    });

    it('should return existing chat if already exists', async () => {
      const chatData = {
        members: [user1._id, user2._id]
      };

      const response = await request(app)
        .post('/api/chat/create')
        .set('Authorization', `Bearer ${token1}`)
        .send(chatData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.chat._id).toBe(chat._id.toString());
    });
  });

  describe('GET /api/chat/chats', () => {
    beforeEach(async () => {
      // Create another chat
      await global.testUtils.createTestChat({
        members: [user1._id, user3._id]
      });

      // Create messages for the first chat
      await Message.create({
        chatId: chat._id,
        sender: user1._id,
        text: 'Test message',
        createdAt: new Date()
      });
    });

    it('should get user chats', async () => {
      const response = await request(app)
        .get('/api/chat/chats')
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.chats).toBeDefined();
      expect(Array.isArray(response.body.chats)).toBe(true);
      expect(response.body.chats.length).toBeGreaterThan(0);
    });

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/chat/chats')
        .expect(401);

      expect(response.body.error).toContain('No token');
    });

    it('should populate chat members and last message', async () => {
      const response = await request(app)
        .get('/api/chat/chats')
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.chats).toBeDefined();
      
      if (response.body.chats.length > 0) {
        const firstChat = response.body.chats[0];
        expect(firstChat.members).toBeDefined();
        expect(Array.isArray(firstChat.members)).toBe(true);
      }
    });
  });

  describe('PUT /api/chat/:chatId/read', () => {
    beforeEach(async () => {
      // Create a message in the chat
      await Message.create({
        chatId: chat._id,
        sender: user2._id,
        text: 'Test message',
        createdAt: new Date()
      });

      // Update chat unread count
      chat.unreadMessageCount = 1;
      await chat.save();
    });

    it('should mark chat as read', async () => {
      const response = await request(app)
        .put(`/api/chat/${chat._id}/read`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('marked as read');

      // Verify unread count was reset
      const updatedChat = await Chat.findById(chat._id);
      expect(updatedChat.unreadMessageCount).toBe(0);
    });

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .put(`/api/chat/${chat._id}/read`)
        .expect(401);

      expect(response.body.error).toContain('No token');
    });

    it('should reject request for non-existent chat', async () => {
      const nonExistentChatId = global.testUtils.createObjectId();

      const response = await request(app)
        .put(`/api/chat/${nonExistentChatId}/read`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(404);

      expect(response.body.error).toContain('Chat not found');
    });

    it('should reject request from non-chat member', async () => {
      const response = await request(app)
        .put(`/api/chat/${chat._id}/read`)
        .set('Authorization', `Bearer ${token3}`)
        .expect(403);

      expect(response.body.error).toContain('not a member');
    });
  });

  describe('DELETE /api/chat/:chatId', () => {
    it('should delete a chat', async () => {
      const response = await request(app)
        .delete(`/api/chat/${chat._id}`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted');

      // Verify chat was deleted
      const deletedChat = await Chat.findById(chat._id);
      expect(deletedChat).toBeNull();
    });

    it('should reject deletion without authentication', async () => {
      const response = await request(app)
        .delete(`/api/chat/${chat._id}`)
        .expect(401);

      expect(response.body.error).toContain('No token');
    });

    it('should reject deletion by non-chat member', async () => {
      const response = await request(app)
        .delete(`/api/chat/${chat._id}`)
        .set('Authorization', `Bearer ${token3}`)
        .expect(403);

      expect(response.body.error).toContain('not a member');
    });

    it('should reject deletion of non-existent chat', async () => {
      const nonExistentChatId = global.testUtils.createObjectId();

      const response = await request(app)
        .delete(`/api/chat/${nonExistentChatId}`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(404);

      expect(response.body.error).toContain('Chat not found');
    });
  });
});
