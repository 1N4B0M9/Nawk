import type { Peer as PeerType, MediaConnection as MediaConnectionType } from 'peerjs';
import Peer from 'peerjs';
import { Participant } from '../types';
import socketService from './socketService';
import audioService from './audioService';
import videoService from './videoService';

type ParticipantChangeListener = () => void;

function buildIceServers(): RTCIceServer[] {
  const iceServers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
  ];

  const turnUrl = import.meta.env.VITE_TURN_URL;
  const turnUsername = import.meta.env.VITE_TURN_USERNAME;
  const turnCredential = import.meta.env.VITE_TURN_CREDENTIAL;

  if (turnUrl && turnUsername && turnCredential) {
    iceServers.push({
      urls: turnUrl,
      username: turnUsername,
      credential: turnCredential,
    });
  }

  return iceServers;
}

class WebRTCService {
  private peer: PeerType | null = null;
  private connections: Map<string, MediaConnectionType> = new Map();
  private localStream: MediaStream | null = null;
  private participants: Map<string, Participant> = new Map();
  private listeners: Set<ParticipantChangeListener> = new Set();
  private userId: string = '';
  private isConnected: boolean = false;
  private connectedParticipants: Set<string> = new Set();
  private vadIntervalId: ReturnType<typeof setInterval> | null = null;

  subscribe(listener: ParticipantChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyParticipantsChanged(): void {
    this.listeners.forEach((listener) => listener());
  }

  async initialize(
    userId: string,
    userName: string,
    roomId: string,
    permissions?: { hasMic: boolean; hasCamera: boolean }
  ): Promise<void> {
    this.userId = userId;

    try {
      await audioService.initialize();

      const audioStream = await audioService.getUserMedia();
      const videoStream = await videoService.getUserMedia();

      this.localStream = new MediaStream([
        ...audioStream.getTracks(),
        ...videoStream.getTracks(),
      ]);

      this.localStream.getTracks().forEach((track) => {
        track.enabled = true;
      });

      const hasMic = permissions?.hasMic ?? audioService.getMicPermission();
      const hasCamera = permissions?.hasCamera ?? videoService.getCameraPermission();

      this.participants.set(userId, {
        id: userId,
        name: userName,
        isSpeaking: false,
        audioLevel: 0,
        stream: this.localStream,
        hasMicPermission: hasMic,
        hasCameraPermission: hasCamera,
      });
      this.notifyParticipantsChanged();

      this.startVoiceActivityDetection();
      await this.initializePeer();
      await socketService.connect();
      this.setupSocketListeners();

      socketService.joinRoom({
        roomId,
        userId,
        userName,
      });
    } catch (error) {
      console.error('Failed to initialize WebRTC service:', error);
      throw error;
    }
  }

  private async initializePeer(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.peer = new Peer(this.userId, {
          debug: import.meta.env.DEV ? 2 : 0,
          config: {
            iceServers: buildIceServers(),
          },
        });

        this.peer.on('open', (id: string) => {
          console.log('PeerJS connection established:', id);
          this.isConnected = true;
          resolve();
        });

        this.peer.on('call', (call: MediaConnectionType) => {
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

    this.closeConnection(peerId, false);
    this.connections.set(peerId, call);

    call.on('stream', (remoteStream: MediaStream) => {
      const participant = this.participants.get(peerId);
      if (participant) {
        const newStream = new MediaStream();
        remoteStream.getTracks().forEach((track) => {
          if (track.kind === 'audio') {
            track.enabled = false;
          }
          newStream.addTrack(track);
        });

        this.participants.set(peerId, {
          ...participant,
          stream: newStream,
          isSpeaking: false,
        });
        this.notifyParticipantsChanged();
      }
    });

    call.on('close', () => {
      this.closeConnection(peerId);
    });

    call.on('error', (error: Error) => {
      console.error('Call error with:', peerId, error);
      this.closeConnection(peerId);
      setTimeout(() => this.callPeer(peerId), 2000);
    });
  }

  private setupSocketListeners(): void {
    socketService.onRoomParticipants((participants) => {
      let changed = false;

      participants.forEach(({ userId, userName }) => {
        if (userId !== this.userId) {
          if (!this.participants.has(userId)) {
            this.participants.set(userId, {
              id: userId,
              name: userName,
              isSpeaking: false,
              audioLevel: 0,
            });
            changed = true;
          }
          setTimeout(() => this.callPeer(userId), 1000);
        }
      });

      if (changed) {
        this.notifyParticipantsChanged();
      }
    });

    socketService.onUserJoined(({ userId, userName }) => {
      if (userId === this.userId) return;

      if (!this.participants.has(userId)) {
        this.participants.set(userId, {
          id: userId,
          name: userName,
          isSpeaking: false,
          audioLevel: 0,
        });
        this.notifyParticipantsChanged();
      }
    });

    socketService.onUserLeft(({ userId }) => {
      this.closeConnection(userId);
      if (this.participants.delete(userId)) {
        this.notifyParticipantsChanged();
      }
    });
  }

  private callPeer(peerId: string): void {
    if (!this.peer || !this.localStream || !this.isConnected) {
      return;
    }

    try {
      const call = this.peer.call(peerId, this.localStream);
      this.handleCall(call);
    } catch (error) {
      console.error('Error calling peer:', peerId, error);
      setTimeout(() => this.callPeer(peerId), 2000);
    }
  }

  private closeConnection(peerId: string, notify = true): void {
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
      participant.stream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (error) {
          console.error('Error stopping track:', error);
        }
      });
      this.participants.set(peerId, {
        ...participant,
        stream: undefined,
      });
      if (notify) {
        this.notifyParticipantsChanged();
      }
    }
  }

  private startVoiceActivityDetection(): void {
    if (this.vadIntervalId) {
      clearInterval(this.vadIntervalId);
    }

    this.vadIntervalId = setInterval(() => {
      if (!this.localStream) {
        return;
      }

      const audioLevel = audioService.getAudioLevel();
      const localParticipant = this.participants.get(this.userId);

      if (localParticipant) {
        const isSpeaking = audioLevel > 0.1;

        if (
          localParticipant.audioLevel !== audioLevel ||
          localParticipant.isSpeaking !== isSpeaking
        ) {
          this.participants.set(this.userId, {
            ...localParticipant,
            audioLevel,
            isSpeaking,
          });
          this.notifyParticipantsChanged();
        }
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
    if (this.vadIntervalId) {
      clearInterval(this.vadIntervalId);
      this.vadIntervalId = null;
    }

    this.connections.forEach((connection) => {
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
    this.connectedParticipants.clear();
    this.isConnected = false;
    this.notifyParticipantsChanged();
  }

  updateConnections(connectedParticipants: string[]): void {
    const newConnections = new Set(connectedParticipants);
    this.connectedParticipants = newConnections;

    this.participants.forEach((participant, id) => {
      if (participant.stream) {
        const isInRange = id === this.userId || newConnections.has(id);
        participant.stream.getAudioTracks().forEach((track) => {
          track.enabled = isInRange;
        });
      }
    });
  }
}

export default new WebRTCService();
