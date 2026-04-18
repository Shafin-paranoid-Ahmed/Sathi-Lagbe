const request = require('supertest');
const { app } = require('../../../index');

describe('Chat Controller (smoke)', () => {
  let user1;
  let user2;
  let token1;

  beforeEach(async () => {
    user1 = await global.testUtils.createTestUser({ email: 'chat-user1@bracu.ac.bd' });
    user2 = await global.testUtils.createTestUser({ email: 'chat-user2@bracu.ac.bd' });
    token1 = global.testUtils.generateToken(user1._id);
  });

  it('creates a chat and returns data envelope', async () => {
    const res = await request(app)
      .post('/api/chat/createnewchat')
      .set('Authorization', `Bearer ${token1}`)
      .send({ members: [user2._id.toString()] })
      .expect((r) => {
        expect([200, 201]).toContain(r.status);
      });

    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  it('lists chats for current user', async () => {
    await request(app)
      .post('/api/chat/createnewchat')
      .set('Authorization', `Bearer ${token1}`)
      .send({ members: [user2._id.toString()] })
      .expect((r) => {
        expect([200, 201]).toContain(r.status);
      });

    const list = await request(app)
      .get('/api/chat/getallchats')
      .set('Authorization', `Bearer ${token1}`)
      .expect(200);

    expect(Array.isArray(list.body.data)).toBe(true);
  });

  it('rejects sending message without chatId', async () => {
    const res = await request(app)
      .post('/api/chat')
      .set('Authorization', `Bearer ${token1}`)
      .send({ text: 'hello' })
      .expect(400);

    expect(res.body.error).toBeDefined();
  });
});
