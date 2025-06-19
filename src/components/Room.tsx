import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { ArrowLeft, Users, AlertCircle, Copy } from 'lucide-react';
import BubbleCanvas from './BubbleCanvas';
import { useNawkNawk } from '../hooks/useNawkNawk';
import webRTCService from '../services/webRTCService';

const RoomContainer = styled.div`
  width: 100vw;
  height: 100vh;
  background: var(--color-bg);
  color: var(--color-text);
  position: relative;
`;

const JoinForm = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: var(--color-bg-secondary);
  padding: 2rem;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  z-index: 100;
  border: 1px solid var(--color-border);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  max-width: 400px;
  width: 90%;
`;

const BackButton = styled.button`
  position: fixed;
  top: 1rem;
  left: 1rem;
  z-index: 200;
  background: var(--color-bg-secondary);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 0.5rem 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
  
  &:hover {
    background: var(--color-accent);
    color: white;
  }
`;

const Input = styled.input`
  padding: 0.75rem;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  color: var(--color-text);
  font-size: 1rem;
  
  &::placeholder {
    color: var(--color-text-secondary);
  }
  
  &:focus {
    outline: none;
    border-color: var(--color-accent);
    box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.1);
  }
`;

const Button = styled.button`
  padding: 0.75rem 1rem;
  border-radius: 8px;
  border: none;
  background: var(--color-accent);
  color: white;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
  
  &:hover {
    background: var(--color-accent-hover);
  }
  
  &:disabled {
    background: var(--color-border);
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled.div`
  background: #fee2e2;
  border: 1px solid #fecaca;
  color: #dc2626;
  padding: 1rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
`;

const RoomInfo = styled.div`
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 200;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: var(--color-text-secondary);
`;

const RoomId = styled.span`
  font-family: monospace;
  font-weight: 600;
  color: var(--color-accent);
`;

const CopyButton = styled.button`
  background: none;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  
  &:hover {
    color: var(--color-accent);
    background: rgba(76, 175, 80, 0.1);
  }
`;

const Room: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [userName, setUserName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [participantCount, setParticipantCount] = useState<number>(0);
  const [maxParticipants] = useState<number>(15);
  const [isHost, setIsHost] = useState<boolean>(false);
  const [copied, setCopied] = useState(false);

  // Get userName and isHost from location state if coming from homepage
  useEffect(() => {
    if (location.state?.userName) {
      setUserName(location.state.userName);
    }
    if (location.state?.isHost !== undefined) {
      setIsHost(location.state.isHost);
    }
  }, [location.state]);

  const {
    isConnected,
    participants,
    localParticipant,
    connect,
    disconnect
  } = useNawkNawk(roomId || 'default');

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim() || !roomId) return;

    setIsConnecting(true);
    setError(null);

    try {
      await connect(userName);
    } catch (err) {
      console.error('Failed to join room:', err);
      setError(err instanceof Error ? err.message : 'Failed to join room');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleConnectionsUpdate = (connectedParticipants: string[]) => {
    webRTCService.updateConnections(connectedParticipants);
  };

  const handleBack = () => {
    if (isConnected) {
      disconnect();
    }
    navigate('/');
  };

  const copyRoomCode = async () => {
    if (!roomId) return;
    
    try {
      await navigator.clipboard.writeText(roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy room code:', err);
    }
  };

  // Update participant count
  useEffect(() => {
    if (isConnected) {
      setParticipantCount(participants.length + (localParticipant ? 1 : 0));
    }
  }, [participants, localParticipant, isConnected]);

  // Validate room ID format
  useEffect(() => {
    if (roomId && !/^[a-zA-Z0-9-]{3,50}$/.test(roomId)) {
      setError('Invalid room ID format. Room ID must be 3-50 characters long and contain only letters, numbers, and hyphens.');
    }
  }, [roomId]);

  if (!roomId) {
    return (
      <RoomContainer>
        <JoinForm>
          <ErrorMessage>
            <AlertCircle size={16} />
            Invalid room URL
          </ErrorMessage>
          <Button onClick={() => navigate('/')}>
            <ArrowLeft size={16} />
            Go Home
          </Button>
        </JoinForm>
      </RoomContainer>
    );
  }

  return (
    <RoomContainer>
      {isConnected && (
        <RoomInfo>
          <Users size={16} />
          {participantCount} / {maxParticipants} participants
          <RoomId>{roomId}</RoomId>
          <CopyButton onClick={copyRoomCode} title="Copy room code">
            <Copy size={14} />
          </CopyButton>
          {copied && (
            <span style={{ 
              color: 'var(--color-accent)', 
              fontSize: '0.8rem',
              marginLeft: '0.5rem'
            }}>
              Copied!
            </span>
          )}
        </RoomInfo>
      )}

      {!isConnected && (
        <JoinForm>
          <h2>Join Room</h2>
          <div style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
            Room ID: <RoomId>{roomId}</RoomId>
            {isHost && (
              <div style={{ marginTop: '0.5rem', color: 'var(--color-accent)' }}>
                ✨ You're the host of this room
              </div>
            )}
          </div>
          
          {error && (
            <ErrorMessage>
              <AlertCircle size={16} />
              {error}
            </ErrorMessage>
          )}

          <form onSubmit={handleJoin}>
            <Input
              type="text"
              placeholder="Enter your name"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              disabled={isConnecting}
              autoFocus
            />
            <Button type="submit" disabled={!userName.trim() || isConnecting}>
              {isConnecting ? 'Joining...' : 'Join Room'}
            </Button>
          </form>
        </JoinForm>
      )}
      
      {isConnected && (
        <BubbleCanvas
          participants={participants}
          localParticipant={localParticipant}
          onUpdateConnections={handleConnectionsUpdate}
          onDisconnect={handleBack}
        />
      )}
    </RoomContainer>
  );
};

export default Room; 