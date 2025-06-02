export interface Participant {
  id: string;
  name: string;
  isSpeaking: boolean;
  audioLevel: number;
  isMuted: boolean;
  stream?: MediaStream;
}

// Import SimplePeer's SignalData type
import { SignalData as SimplePeerSignalData } from 'simple-peer';
export type SignalData = SimplePeerSignalData;

export interface PeerSignalData {
  signal: SignalData;
  from: string;
  to: string;
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