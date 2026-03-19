import { io } from 'socket.io-client';

let socket = null;

export const initSocket = (token) => {
  if (!socket || !socket.connected) {
    socket = io(window.location.origin, {
      auth: { token },
      transports: ['websocket', 'polling'],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('✓ Socket connected:', socket.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('✗ Socket disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
    });
  }

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const joinUserRoom = (email) => {
  if (socket) socket.emit('join_user', email);
};

export const joinRoom = (room) => {
  if (socket) socket.emit('join_room', room);
};

export const leaveRoom = (room) => {
  if (socket) socket.emit('leave_room', room);
};

export const onReceiveMessage = (callback) => {
  if (socket) socket.on('receive_message', callback);
  return () => {
    if (socket) socket.off('receive_message', callback);
  };
};

export const onOnlineUsers = (callback) => {
  if (socket) socket.on('online_users', callback);
  return () => {
    if (socket) socket.off('online_users', callback);
  };
};

export const sendTyping = (conversationId, receiverEmail) => {
  if (socket) socket.emit('typing', { conversationId, receiverEmail });
};

export const stopTyping = (conversationId, receiverEmail) => {
  if (socket) socket.emit('stop_typing', { conversationId, receiverEmail });
};

export const onUserTyping = (callback) => {
  if (socket) socket.on('user_typing', callback);
  return () => {
    if (socket) socket.off('user_typing', callback);
  };
};

export const onUserStoppedTyping = (callback) => {
  if (socket) socket.on('user_stopped_typing', callback);
  return () => {
    if (socket) socket.off('user_stopped_typing', callback);
  };
};

export const onIncomingCall = (callback) => {
  if (socket) socket.on('incoming_call', callback);
  return () => {
    if (socket) socket.off('incoming_call', callback);
  };
};

export const onCallAccepted = (callback) => {
  if (socket) socket.on('call_accepted', callback);
  return () => {
    if (socket) socket.off('call_accepted', callback);
  };
};

export const onCallRejected = (callback) => {
  if (socket) socket.on('call_rejected', callback);
  return () => {
    if (socket) socket.off('call_rejected', callback);
  };
};

export const onCallEnded = (callback) => {
  if (socket) socket.on('call_ended', callback);
  return () => {
    if (socket) socket.off('call_ended', callback);
  };
};