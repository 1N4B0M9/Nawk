import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Participant } from '../types';
import webRTCService from '../services/webRTCService';
import socketService from '../services/socketService';

export const useNawkNawk = (roomId: string = 'room-demo-01') => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [localParticipant, setLocalParticipant] = useState<Participant | null>(null);
  const [participantCount, setParticipantCount] = useState<number>(0);
  const [maxParticipants] = useState<number>(15);

  // Update participants state from service
  const updateParticipantsState = useCallback(() => {
    const allParticipants = webRTCService.getParticipants();
    const local = webRTCService.getLocalParticipant();
    
    if (local) {
      setLocalParticipant(local);
      
      // Filter out local participant from the list
      setParticipants(allParticipants.filter(p => p.id !== local.id));
    } else {
      setParticipants(allParticipants);
    }
  }, []);

  // Connect to a room
  const connect = useCallback(async (userName: string) => {
    if (isConnected || isConnecting) return;
    
    setIsConnecting(true);
    setError(null);
    
    try {
      const userId = uuidv4();
      
      // Connect to socket server first
      await socketService.connect();
      
      // Set up socket event listeners
      socketService.onJoinSuccess((data) => {
        console.log('Successfully joined room:', data);
        setParticipantCount(data.participantCount);
      });
      
      socketService.onJoinError((data) => {
        console.error('Failed to join room:', data.error);
        setError(data.error);
        setIsConnecting(false);
      });
      
      // Join the room
      socketService.joinRoom({
        roomId,
        userId,
        userName
      });
      
      // Initialize WebRTC service
      await webRTCService.initialize(userId, userName, roomId);
      setIsConnected(true);
      
      // Start polling for participants
      updateParticipantsState();
    } catch (err) {
      console.error('Failed to connect:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect');
      setIsConnecting(false);
    }
  }, [isConnected, isConnecting, roomId, updateParticipantsState]);

  // Disconnect from the room
  const disconnect = useCallback(() => {
    if (!isConnected) return;
    
    try {
      socketService.leaveRoom();
      socketService.disconnect();
      webRTCService.cleanup();
    } catch (err) {
      console.error('Error during cleanup:', err);
    } finally {
      setIsConnected(false);
      setParticipants([]);
      setLocalParticipant(null);
      setParticipantCount(0);
      setError(null);
    }
  }, [isConnected]);

  // Set up polling interval to update participants state
  useEffect(() => {
    if (!isConnected) return;
    
    const interval = setInterval(() => {
      updateParticipantsState();
    }, 100); // Update every 100ms
    
    return () => clearInterval(interval);
  }, [isConnected, updateParticipantsState]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (isConnected) {
        disconnect();
      }
      // Clean up socket listeners
      socketService.offJoinSuccess();
      socketService.offJoinError();
    };
  }, [isConnected, disconnect]);

  return {
    isConnected,
    isConnecting,
    error,
    participants,
    localParticipant,
    participantCount,
    maxParticipants,
    connect,
    disconnect,
  };
};