import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Participant } from '../types';
import webRTCService from '../services/webRTCService';

export const useVoiceflow = (roomId: string = 'room-demo-01') => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [localParticipant, setLocalParticipant] = useState<Participant | null>(null);

  // Connect to a room
  const connect = useCallback(async (userName: string) => {
    if (isConnected || isConnecting) return;
    
    setIsConnecting(true);
    setError(null);
    
    try {
      const userId = uuidv4();
      await webRTCService.initialize(userId, userName, roomId);
      setIsConnected(true);
      
      // Start polling for participants
      updateParticipantsState();
    } catch (err) {
      console.error('Failed to connect:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect');
    } finally {
      setIsConnecting(false);
    }
  }, [isConnected, isConnecting, roomId]);

  // Disconnect from the room
  const disconnect = useCallback(() => {
    if (!isConnected) return;
    
    try {
      webRTCService.cleanup();
    } catch (err) {
      console.error('Error during cleanup:', err);
    } finally {
      setIsConnected(false);
      setParticipants([]);
      setLocalParticipant(null);
    }
  }, [isConnected]);

  // Toggle mute state
  const toggleMute = useCallback(() => {
    if (!isConnected || !localParticipant) return false;
    
    const isMuted = webRTCService.toggleMute();
    setLocalParticipant(prev => prev ? { ...prev, isMuted } : null);
    return isMuted;
  }, [isConnected, localParticipant]);

  // Toggle video state
  const toggleVideo = useCallback(() => {
    if (!isConnected || !localParticipant) return false;
    
    const isEnabled = webRTCService.toggleVideo();
    updateParticipantsState(); // Update state to reflect video changes
    return isEnabled;
  }, [isConnected, localParticipant]);

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
        webRTCService.cleanup();
      }
    };
  }, [isConnected]);

  return {
    isConnected,
    isConnecting,
    error,
    participants,
    localParticipant,
    connect,
    disconnect,
    toggleMute,
    toggleVideo,
  };
};