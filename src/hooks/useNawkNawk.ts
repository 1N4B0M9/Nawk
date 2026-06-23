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

  const syncParticipants = useCallback(() => {
    const allParticipants = webRTCService.getParticipants();
    const local = webRTCService.getLocalParticipant();

    if (local) {
      setLocalParticipant(local);
      setParticipants(allParticipants.filter((p) => p.id !== local.id));
    } else {
      setLocalParticipant(null);
      setParticipants(allParticipants);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = webRTCService.subscribe(syncParticipants);
    return unsubscribe;
  }, [syncParticipants]);

  const connect = useCallback(
    async (userName: string, permissions?: { hasMic: boolean; hasCamera: boolean }) => {
      if (isConnected || isConnecting) return;

      setIsConnecting(true);
      setError(null);

      try {
        const userId = uuidv4();

        await socketService.connect();

        socketService.onJoinSuccess((data) => {
          setParticipantCount(data.participantCount);
        });

        socketService.onJoinError((data) => {
          setError(data.error);
        });

        await webRTCService.initialize(userId, userName, roomId, permissions);
        setIsConnected(true);
        syncParticipants();
      } catch (err) {
        console.error('Failed to connect:', err);
        setError(err instanceof Error ? err.message : 'Failed to connect');
        webRTCService.cleanup();
      } finally {
        setIsConnecting(false);
      }
    },
    [isConnected, isConnecting, roomId, syncParticipants]
  );

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
      setParticipantCount(0);
      setError(null);
    }
  }, [isConnected]);

  useEffect(() => {
    return () => {
      socketService.offJoinSuccess();
      socketService.offJoinError();
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
    participantCount,
    maxParticipants,
    connect,
    disconnect,
  };
};
