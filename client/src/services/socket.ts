import { io, Socket } from 'socket.io-client';

let socketInstance: Socket | null = null;

export function getSocket(): Socket {
  if (!socketInstance) {
    const rawSocketUrl = import.meta.env.VITE_SOCKET_URL;
    const socketUrl = rawSocketUrl ? rawSocketUrl.trim().replace(/\/+$/, '') : '/';

    socketInstance = io(socketUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
  }
  return socketInstance;
}

