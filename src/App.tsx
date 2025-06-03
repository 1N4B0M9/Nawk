import React, { useState, useCallback } from 'react';
import { useVoiceflow } from './hooks/useVoiceflow';
import BubbleCanvas from './components/BubbleCanvas';
import styled from 'styled-components';
import webRTCService from './services/webRTCService';

const AppContainer = styled.div`
  width: 100vw;
  height: 100vh;
  background: #1a1a1a;
  color: white;
`;

const JoinForm = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: #2a2a2a;
  padding: 2rem;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  z-index: 100;
`;

const Input = styled.input`
  padding: 0.5rem;
  border-radius: 4px;
  border: 1px solid #3a3a3a;
  background: #1a1a1a;
  color: white;
  font-size: 1rem;
`;

const Button = styled.button`
  padding: 0.5rem 1rem;
  border-radius: 4px;
  border: none;
  background: #4CAF50;
  color: white;
  font-size: 1rem;
  cursor: pointer;
  
  &:hover {
    background: #45a049;
  }
  
  &:disabled {
    background: #666;
    cursor: not-allowed;
  }
`;

const App: React.FC = () => {
  const [userName, setUserName] = useState('');
  const { 
    isConnected,
    isConnecting,
    participants,
    localParticipant,
    connect,
    disconnect
  } = useVoiceflow();

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (userName.trim()) {
      connect(userName);
    }
  };

  const handleConnectionsUpdate = useCallback((connectedParticipants: string[]) => {
    // Update WebRTC connections based on proximity
    webRTCService.updateConnections(connectedParticipants);
  }, []);

  return (
    <AppContainer>
      {!isConnected && (
        <JoinForm>
          <h2>Join Meeting</h2>
          <form onSubmit={handleJoin}>
            <Input
              type="text"
              placeholder="Enter your name"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              disabled={isConnecting}
            />
            <Button type="submit" disabled={!userName.trim() || isConnecting}>
              {isConnecting ? 'Joining...' : 'Join'}
            </Button>
          </form>
        </JoinForm>
      )}
      
      {isConnected && (
        <BubbleCanvas
          participants={participants}
          localParticipant={localParticipant}
          onUpdateConnections={handleConnectionsUpdate}
        />
      )}
    </AppContainer>
  );
};

export default App;