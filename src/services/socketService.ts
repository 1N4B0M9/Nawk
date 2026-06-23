import { io, Socket } from 'socket.io-client';
import { JoinRoomData, PeerSignalData } from '../types';

const currentHost = window.location.hostname;
const SOCKET_SERVER = currentHost.includes('webcontainer')
  ? `http://${currentHost.replace('--5173', '--3000')}`
  : currentHost === 'nawknawk.fly.dev'
    ? 'https://nawknawk.fly.dev'
    : 'http://localhost:3000';

class SocketService {
  private socket: Socket | null = null;
  private roomId: string | null = null;
  private userId: string | null = null;
  private connectPromise: Promise<Socket> | null = null;

  connect(): Promise<Socket> {
    if (this.socket?.connected) {
      return Promise.resolve(this.socket);
    }

    if (this.connectPromise) {
      return this.connectPromise;
    }

    this.connectPromise = new Promise((resolve, reject) => {
      try {
        if (!this.socket) {
          this.socket = io(SOCKET_SERVER, {
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
          });
        }

        const onConnect = () => {
          cleanup();
          resolve(this.socket as Socket);
        };

        const onConnectError = (error: Error) => {
          cleanup();
          this.connectPromise = null;
          reject(error);
        };

        const cleanup = () => {
          this.socket?.off('connect', onConnect);
          this.socket?.off('connect_error', onConnectError);
        };

        if (this.socket.connected) {
          this.connectPromise = null;
          resolve(this.socket);
          return;
        }

        this.socket.on('connect', onConnect);
        this.socket.on('connect_error', onConnectError);
      } catch (error) {
        this.connectPromise = null;
        reject(error);
      }
    });

    return this.connectPromise.then((socket) => {
      this.connectPromise = null;
      return socket;
    });
  }

  disconnect(): void {
    this.connectPromise = null;
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
    this.userId = null;
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

  onJoinSuccess(callback: (data: { roomId: string; participantCount: number; maxParticipants: number }) => void): void {
    if (!this.socket) {
      throw new Error('Socket not connected');
    }

    this.socket.on('join-success', callback);
  }

  onJoinError(callback: (data: { error: string }) => void): void {
    if (!this.socket) {
      throw new Error('Socket not connected');
    }

    this.socket.on('join-error', callback);
  }

  updatePosition(position: { x: number; y: number }): void {
    if (!this.socket || !this.roomId || !this.userId) {
      throw new Error('Socket not connected or room not joined');
    }

    this.socket.emit('update-position', {
      roomId: this.roomId,
      userId: this.userId,
      position,
    });
  }

  requestInitialPositions(): void {
    if (!this.socket || !this.roomId) {
      throw new Error('Socket not connected or room not joined');
    }

    this.socket.emit('request-initial-positions', {
      roomId: this.roomId,
    });
  }

  onPositionUpdate(callback: (data: { userId: string; position: { x: number; y: number } }) => void): void {
    if (!this.socket) {
      throw new Error('Socket not connected');
    }

    this.socket.on('position-update', callback);
  }

  onInitialPositions(callback: (positions: { [key: string]: { x: number; y: number } }) => void): void {
    if (!this.socket) {
      throw new Error('Socket not connected');
    }

    this.socket.on('initial-positions', callback);
  }

  offPositionUpdate(): void {
    this.socket?.off('position-update');
  }

  offInitialPositions(): void {
    this.socket?.off('initial-positions');
  }

  offJoinSuccess(): void {
    this.socket?.off('join-success');
  }

  offJoinError(): void {
    this.socket?.off('join-error');
  }

  removeAllListeners(): void {
    if (!this.socket) {
      return;
    }

    this.socket.removeAllListeners('room-participants');
    this.socket.removeAllListeners('user-joined');
    this.socket.removeAllListeners('user-left');
    this.socket.removeAllListeners('signal');
    this.socket.removeAllListeners('join-success');
    this.socket.removeAllListeners('join-error');
    this.socket.removeAllListeners('position-update');
    this.socket.removeAllListeners('initial-positions');
  }
}

export default new SocketService();
