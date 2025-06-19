export interface Participant {
  id: string;
  name: string;
  stream?: MediaStream;
  isSpeaking: boolean;
  audioLevel: number;
  isMuted?: boolean;
  position?: {
    x: number;
    y: number;
  };
}

export interface JoinRoomData {
  roomId: string;
  userId: string;
  userName: string;
}

export interface RoomData {
  userId: string;
  userName: string;
  position?: {
    x: number;
    y: number;
  };
}

export interface PeerSignalData {
  from: string;
  to: string;
  signal: RTCSessionDescriptionInit | RTCIceCandidateInit;
}

export interface PositionData {
  userId: string;
  position: {
    x: number;
    y: number;
  };
}

export interface AudioProcessingOptions {
  noiseReduction: boolean;
  gainControl: boolean;
  echoCancellation: boolean;
} 