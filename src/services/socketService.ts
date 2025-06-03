import { io, Socket } from 'socket.io-client';
import { JoinRoomData, PeerSignalData, RoomData } from '../types';

// Get the current hostname and port from the window location
const currentHost = window.location.hostname;
const SOCKET_SERVER = currentHost.includes('webcontainer') 
  ? `http://${currentHost.replace('--5173', '--3000')}` // Replace Vite's port with Socket server port
  : 'http://localhost:3000'; // Fallback for local development

class SocketService {
  private socket: Socket | null = null;
  private roomId: string | null = null;
  private userId: string | null = null;

  constructor() {
    this.socket = null;
    this.roomId = null;
    this.userId = null;
  }

  connect(): Promise<Socket> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = io(SOCKET_SERVER, {
          transports: ['websocket'],
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
        });

        this.socket.on('connect', () => {
          console.log('Connected to signaling server');
          resolve(this.socket as Socket);
        });

        this.socket.on('connect_error', (error) => {
          console.error('Connection error:', error);
          reject(error);
        });
      } catch (error) {
        console.error('Socket initialization error:', error);
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.roomId = null;
      this.userId = null;
    }
  }

  joinRoom(data: JoinRoomData): void {
    if (!this.socket) {
      throw new Error('Socket not connected');
    }
    
    this.roomId = data.roomId;
    this.userId = data.userId;
    this.socket.emit('join-room', data);
  }

  leaveRoom(): void {
    if (!this.socket || !this.roomId) {
      return;
    }
    
    this.socket.emit('leave-room', { roomId: this.roomId, userId: this.userId });
    this.roomId = null;
  }

  signalPeer(data: PeerSignalData): void {
    if (!this.socket) {
      throw new Error('Socket not connected');
    }
    
    this.socket.emit('signal', data);
  }

  onRoomParticipants(callback: (data: { userId: string; userName: string }[]) => void): void {
    if (!this.socket) {
      throw new Error('Socket not connected');
    }
    
    this.socket.on('room-participants', callback);
  }

  onUserJoined(callback: (data: { userId: string; userName: string }) => void): void {
    if (!this.socket) {
      throw new Error('Socket not connected');
    }
    
    this.socket.on('user-joined', callback);
  }

  onUserLeft(callback: (data: { userId: string }) => void): void {
    if (!this.socket) {
      throw new Error('Socket not connected');
    }
    
    this.socket.on('user-left', callback);
  }

  onSignal(callback: (data: PeerSignalData) => void): void {
    if (!this.socket) {
      throw new Error('Socket not connected');
    }
    
    this.socket.on('signal', callback);
  }

  updatePosition(position: { x: number; y: number }): void {
    if (!this.socket || !this.roomId || !this.userId) {
      throw new Error('Socket not connected or room not joined');
    }
    
    this.socket.emit('update-position', {
      roomId: this.roomId,
      userId: this.userId,
      position
    });
  }

  onPositionUpdate(callback: (data: { userId: string; position: { x: number; y: number } }) => void): void {
    if (!this.socket) {
      throw new Error('Socket not connected');
    }
    
    this.socket.on('position-update', callback);
  }

  removeAllListeners(): void {
    if (!this.socket) {
      return;
    }
    
    this.socket.removeAllListeners('room-participants');
    this.socket.removeAllListeners('user-joined');
    this.socket.removeAllListeners('user-left');
    this.socket.removeAllListeners('signal');
  }
}

// Export as singleton
export default new SocketService();