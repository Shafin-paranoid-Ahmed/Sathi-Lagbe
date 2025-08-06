# Chat Troubleshooting Guide

## 🔧 Issues Fixed and Debugging Steps

### What I've Fixed:

1. **Socket.IO Architecture Improvements** ✅
   - Created `server/utils/socket.js` to properly manage Socket.IO instance
   - Fixed circular dependency issues
   - Updated message controller to use `getIO()` helper

2. **Client-Side Event Handling** ✅
   - Updated message handling to prevent duplicate messages
   - Added proper cleanup for chat room joining/leaving
   - Added debug logging for connection status

3. **Debug Utilities** ✅
   - Created `client/src/utils/debugSocket.js` for debugging
   - Added connection status logging
   - Added browser console debug tools

## 🐛 Common Issues and Solutions

### Issue 1: Chat Messages Not Appearing in Real-Time

**Symptoms:**
- Messages sent via HTTP but not appearing in real-time
- No Socket.IO connection established

**Debug Steps:**
1. Open browser developer tools and check console for logs
2. Look for these messages:
   ```
   Initializing Socket.IO connection...
   Socket connected: [socket-id]
   Socket.IO Debug Info
   ```

3. If no connection, check:
   - Server is running (`npm run dev` in server folder)
   - JWT token exists in sessionStorage
   - No CORS errors in console

**Solution:**
```javascript
// In browser console, run:
window.debugSocket.status()
```

### Issue 2: Socket.IO Connection Fails

**Symptoms:**
- Console shows "Socket connection error"
- Authentication errors

**Debug Steps:**
1. Check JWT token:
   ```javascript
   console.log('Token:', sessionStorage.getItem('token'))
   console.log('User ID:', sessionStorage.getItem('userId'))
   ```

2. Verify server JWT_SECRET environment variable
3. Check if user is properly logged in

**Solution:**
- Re-login to get fresh token
- Verify `.env` file has `JWT_SECRET` set

### Issue 3: Messages Duplicated

**Symptoms:**
- Same message appears twice
- Optimistic updates not working properly

**This has been fixed in the latest code:**
- Updated `handleNewMessage` to filter out messages from current user
- Prevents duplicates from optimistic updates

### Issue 4: Room Management Issues

**Symptoms:**
- Messages not reaching other users
- Users not joining chat rooms properly

**Debug Steps:**
1. Check console for room join/leave messages:
   ```
   Joining chat room: [chat-id]
   Leaving chat room: [chat-id]
   ```

2. Server logs should show:
   ```
   User [username] joined chat: [chat-id]
   Message relayed in chat [chat-id] by [username]
   ```

## 🧪 Testing Procedure

### Step 1: Start Both Servers
```bash
# Terminal 1 - Server
cd server
npm run dev

# Terminal 2 - Client  
cd client
npm run dev
```

### Step 2: Test Socket.IO Connection
1. Open browser and navigate to your app
2. Login with a user account
3. Open developer tools console
4. Look for Socket.IO connection messages
5. Run: `window.debugSocket.status()`

### Step 3: Test Real-Time Chat
1. Open two browser windows/tabs
2. Login with different accounts in each
3. Start a chat between the users
4. Send a message from one window
5. Verify it appears instantly in the other window

### Step 4: Debug if Not Working

**Check Server Logs:**
```bash
# Should see these messages:
User connected: [username] ([userId])
User [username] joined chat: [chatId]
Message relayed in chat [chatId] by [username]
```

**Check Browser Console:**
```javascript
// Run these commands in browser console:
window.debugSocket.status()
window.debugSocket.test('your-chat-id')
```

**Manual Connection Test:**
```javascript
// Force reconnect in browser console:
window.debugSocket.disconnect()
window.debugSocket.connect()
```

## 🔍 Common Environment Issues

### Environment Variables
Make sure your server `.env` file has:
```env
JWT_SECRET=your_jwt_secret_here
CLIENT_URL=http://localhost:5173
MONGO_URI=your_mongodb_connection_string
```

### Port Conflicts
- Server runs on port 5000
- Client runs on port 5173
- Make sure no other applications are using these ports

### CORS Issues
If you see CORS errors, the `server/utils/socket.js` should handle this with:
```javascript
cors: {
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  methods: ['GET', 'POST'],
  credentials: true
}
```

## 🚨 Emergency Debug Steps

If chat still doesn't work after following above steps:

1. **Reset everything:**
   ```bash
   # Kill all node processes
   taskkill /f /im node.exe
   
   # Restart server
   cd server && npm run dev
   
   # Restart client  
   cd client && npm run dev
   ```

2. **Clear browser data:**
   - Clear localStorage/sessionStorage
   - Hard refresh (Ctrl+Shift+R)
   - Login again

3. **Check network tab:**
   - Look for Socket.IO WebSocket connections
   - Check for failed requests
   - Verify API calls are successful

## 📞 Still Not Working?

If you've followed all steps and chat still doesn't work:

1. **Capture debug info:**
   ```javascript
   // Run in browser console and share output:
   console.log('Token:', sessionStorage.getItem('token'))
   console.log('User ID:', sessionStorage.getItem('userId'))
   window.debugSocket.status()
   ```

2. **Check server terminal** for any error messages

3. **Share these logs** for further assistance:
   - Browser console logs
   - Server terminal output
   - Network tab showing WebSocket connections

The implementation is solid - most issues are typically related to:
- Server not running
- Authentication tokens
- Environment variables
- Port conflicts

Following this guide should resolve the chat functionality!