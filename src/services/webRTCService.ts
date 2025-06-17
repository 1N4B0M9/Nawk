import type { Peer as PeerType, MediaConnection as MediaConnectionType } from 'peerjs';
import Peer from 'peerjs';
import { Participant } from '../types';
import socketService from './socketService';
import audioService from './audioService';
import videoService from './videoService';

declare module 'peerjs' {
  export interface MediaConnection {
    peer: string;
    on(event: 'stream', cb: (stream: MediaStream) => void): void;
    on(event: 'close', cb: () => void): void;
    on(event: 'error', cb: (error: Error) => void): void;
    answer(stream: MediaStream): void;
    close(): void;
  }

  export class Peer {
    constructor(id: string, options?: any);
    on(event: 'open', cb: (id: string) => void): void;
    on(event: 'call', cb: (call: MediaConnection) => void): void;
    on(event: 'error', cb: (error: Error) => void): void;
    call(peerId: string, stream: MediaStream): MediaConnection;
    destroy(): void;
  }
}

// Polyfill for process.nextTick
if (typeof window !== 'undefined' && !window.process) {
  (window as any).process = { env: {} };
}

class WebRTCService {
  private peer: PeerType | null = null;
  private connections: Map<string, MediaConnectionType> = new Map();
  private localStream: MediaStream | null = null;
  private participants: Map<string, Participant> = new Map();
  private userId: string = '';
  private userName: string = '';
  private roomId: string = '';
  private isConnected: boolean = false;
  private connectedParticipants: Set<string> = new Set();

  constructor() {
    this.peer = null;
    this.connections = new Map();
    this.localStream = null;
    this.participants = new Map();
    this.isConnected = false;
  }

  async initialize(userId: string, userName: string, roomId: string): Promise<void> {
    this.userId = userId;
    this.userName = userName;
    this.roomId = roomId;
    
    try {
      // Initialize audio service
      await audioService.initialize();
      
      // Get local media streams
      const audioStream = await audioService.getUserMedia();
      const videoStream = await videoService.getUserMedia();
      
      // Combine audio and video streams
      this.localStream = new MediaStream([
        ...audioStream.getTracks(),
        ...videoStream.getTracks()
      ]);

      // Ensure all tracks are enabled
      this.localStream.getTracks().forEach(track => {
        track.enabled = true;
      });
      
      // Add local participant
      this.participants.set(userId, {
        id: userId,
        name: userName,
        isSpeaking: false,
        audioLevel: 0,
        stream: this.localStream
      });
      
      // Set up voice activity detection
      this.startVoiceActivityDetection();
      
      // Initialize PeerJS
      await this.initializePeer();
      
      // Connect to signaling server
      await socketService.connect();
      
      // Set up socket event listeners
      this.setupSocketListeners();
      
      // Join the room
      socketService.joinRoom({
        roomId,
        userId,
        userName,
      });
      
      console.log('WebRTC service initialized');
    } catch (error) {
      console.error('Failed to initialize WebRTC service:', error);
      throw error;
    }
  }

  private async initializePeer(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.peer = new Peer(this.userId, {
          debug: 3,
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              {
                urls: 'turn:numb.viagenie.ca',
                username: 'webrtc@live.com',
                credential: 'muazkh'
              }
            ]
          }
        });

        this.peer.on('open', (id: string) => {
          console.log('PeerJS connection established:', id);
          this.isConnected = true;
          resolve();
        });

        this.peer.on('call', (call: MediaConnectionType) => {
          console.log('Receiving call from:', call.peer);
          
          if (this.localStream) {
            call.answer(this.localStream);
            this.handleCall(call);
          }
        });

        this.peer.on('error', (error: Error) => {
          console.error('PeerJS error:', error);
          if (!this.isConnected) {
            reject(error);
          }
        });

        this.peer.on('disconnected', () => {
          console.log('PeerJS disconnected, attempting to reconnect...');
          this.peer?.reconnect();
        });

        setTimeout(() => {
          if (!this.isConnected) {
            reject(new Error('PeerJS connection timeout'));
          }
        }, 10000);

      } catch (error) {
        reject(error);
      }
    });
  }

  private handleCall(call: MediaConnectionType): void {
    const peerId = call.peer;
    
    this.closeConnection(peerId);
    
    console.log('Setting up new call with:', peerId);
    this.connections.set(peerId, call);

    call.on('stream', (remoteStream: MediaStream) => {
      console.log('Received stream from:', peerId);
      
      const participant = this.participants.get(peerId);
      if (participant) {
        // Create a new MediaStream to avoid reference issues
        const newStream = new MediaStream();
        remoteStream.getTracks().forEach(track => {
          // Start with audio disabled until proximity is established
          if (track.kind === 'audio') {
            track.enabled = false;
          }
          newStream.addTrack(track);
        });

        this.participants.set(peerId, {
          ...participant,
          stream: newStream,
          isSpeaking: false
        });
      }
    });

    call.on('close', () => {
      console.log('Call closed with:', peerId);
      this.closeConnection(peerId);
    });

    call.on('error', (error: Error) => {
      console.error('Call error with:', peerId, error);
      this.closeConnection(peerId);
      setTimeout(() => this.callPeer(peerId), 2000);
    });
  }

  private setupSocketListeners(): void {
    socketService.onRoomParticipants(participants => {
      console.log('Received room participants:', participants);
      participants.forEach(({ userId, userName }) => {
        if (userId !== this.userId) {
          if (!this.participants.has(userId)) {
            this.participants.set(userId, {
              id: userId,
              name: userName,
              isSpeaking: false,
              audioLevel: 0
            });
          }
          setTimeout(() => this.callPeer(userId), 1000);
        }
      });
    });

    socketService.onUserJoined(({ userId, userName }) => {
      console.log(`User joined: ${userName} (${userId})`);
      if (userId === this.userId) return;

      if (!this.participants.has(userId)) {
        this.participants.set(userId, {
          id: userId,
          name: userName,
          isSpeaking: false,
          audioLevel: 0
        });
      }
    });

    socketService.onUserLeft(({ userId }) => {
      console.log(`User left: ${userId}`);
      this.closeConnection(userId);
      this.participants.delete(userId);
    });
  }

  private callPeer(peerId: string): void {
    if (!this.peer || !this.localStream || !this.isConnected) {
      console.warn('Cannot call peer, prerequisites not met:', {
        hasPeer: !!this.peer,
        hasLocalStream: !!this.localStream,
        isConnected: this.isConnected
      });
      return;
    }

    try {
      console.log('Calling peer:', peerId);
      const call = this.peer.call(peerId, this.localStream);
      this.handleCall(call);
    } catch (error) {
      console.error('Error calling peer:', peerId, error);
      setTimeout(() => this.callPeer(peerId), 2000);
    }
  }

  private closeConnection(peerId: string): void {
    const connection = this.connections.get(peerId);
    if (connection) {
      try {
        connection.close();
      } catch (error) {
        console.error('Error closing connection:', error);
      }
      this.connections.delete(peerId);
    }

    const participant = this.participants.get(peerId);
    if (participant?.stream) {
      participant.stream.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (error) {
          console.error('Error stopping track:', error);
        }
      });
      this.participants.set(peerId, {
        ...participant,
        stream: undefined
      });
    }
  }

  private startVoiceActivityDetection(): void {
    const detectInterval = setInterval(() => {
      if (!this.localStream) {
        clearInterval(detectInterval);
        return;
      }
      
      const audioLevel = audioService.getAudioLevel();
      
      const localParticipant = this.participants.get(this.userId);
      if (localParticipant) {
        const isSpeaking = audioLevel > 0.1;
        
        this.participants.set(this.userId, {
          ...localParticipant,
          audioLevel,
          isSpeaking,
        });
      }
    }, 100);
  }

  getParticipants(): Participant[] {
    return Array.from(this.participants.values());
  }

  getLocalParticipant(): Participant | undefined {
    return this.participants.get(this.userId);
  }

  cleanup(): void {
    this.connections.forEach(connection => {
      connection.close();
    });
    this.connections.clear();
    
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    
    audioService.cleanup();
    videoService.cleanup();
    
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        track.stop();
      });
      this.localStream = null;
    }
    
    socketService.removeAllListeners();
    socketService.leaveRoom();
    socketService.disconnect();
    
    this.participants.clear();
  }

  updateConnections(connectedParticipants: string[]): void {
    // Convert array to Set for efficient lookups
    const newConnections = new Set(connectedParticipants);
    
    // Handle disconnections
    this.connectedParticipants.forEach(participantId => {
      if (!newConnections.has(participantId)) {
        // Participant is no longer in range, mute their audio
        const participant = this.participants.get(participantId);
        if (participant?.stream) {
          participant.stream.getAudioTracks().forEach(track => {
            track.enabled = false;
          });
        }
      }
    });

    // Handle new connections
    newConnections.forEach(participantId => {
      if (!this.connectedParticipants.has(participantId)) {
        // New participant in range, unmute their audio
        const participant = this.participants.get(participantId);
        if (participant?.stream) {
          participant.stream.getAudioTracks().forEach(track => {
            track.enabled = true;
          });
        }
      }
    });

    // Update the set of connected participants
    this.connectedParticipants = newConnections;

    // Update participant states - enable audio for all connected participants
    this.participants.forEach((participant, id) => {
      if (participant.stream) {
        const isConnected = id === this.userId || newConnections.has(id);
        participant.stream.getAudioTracks().forEach(track => {
          track.enabled = isConnected;
        });
      }
    });
  }
}

// Export as singleton
export default new WebRTCService();