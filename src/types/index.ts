export interface Participant {
  id: string;
  name: string;
  isSpeaking: boolean;
  audioLevel: number;
  stream?: MediaStream;
  hasMicPermission?: boolean;
  hasCameraPermission?: boolean;
  isMuted?: boolean;
  position?: {
    x: number;
    y: number;
  };
}

export type SignalData = RTCSessionDescriptionInit | RTCIceCandidateInit;

export interface PeerSignalData {
  from: string;
  to: string;
  signal: SignalData;
}

export interface JoinRoomData {
  roomId: string;
  userId: string;
  userName: string;
}

export interface RoomData {
  roomId: string;
  participants: Participant[];
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

export interface RoomInfo {
  id: string;
  name: string;
  participants: number;
}
