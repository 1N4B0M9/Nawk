import React, { useState, useCallback, useEffect } from 'react';
import { useVoiceflow } from './hooks/useVoiceflow';
import BubbleCanvas from './components/BubbleCanvas';
import styled from 'styled-components';
import webRTCService from './services/webRTCService';

const AppContainer = styled.div`
  width: 100vw;
  height: 100vh;
  background: var(--color-bg);
  color: var(--color-text);
`;

const JoinForm = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: var(--color-bg-secondary);
  padding: 2rem;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  z-index: 100;
  border: 1px solid var(--color-border);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
`;

const Input = styled.input`
  padding: 0.5rem;
  border-radius: 4px;
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  color: var(--color-text);
  font-size: 1rem;
  &::placeholder {
    color: #9ca3af;
  }
`;

const Button = styled.button`
  padding: 0.5rem 1rem;
  border-radius: 4px;
  border: none;
  background: var(--color-accent);
  color: white;
  font-size: 1rem;
  cursor: pointer;
  
  &:hover {
    background: var(--color-accent-hover);
  }
  
  &:disabled {
    background: var(--color-border);
    cursor: not-allowed;
  }
`;

const ThemeToggle = styled.button`
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 200;
  background: var(--color-accent);
  color: #fff;
  border: none;
  border-radius: 9999px;
  padding: 0.5rem 1rem;
  font-size: 1rem;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  transition: background 0.2s;
  &:hover {
    background: var(--color-accent-hover);
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

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme');
      if (stored === 'light' || stored === 'dark') return stored;
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    }
    return 'light';
  });

  useEffect(() => {
    const html = document.documentElement;
    if (theme === 'dark') {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'));

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
      <ThemeToggle onClick={toggleTheme} aria-label="Toggle theme">
        {theme === 'dark' ? '🌙 Dark' : '☀️ Light'}
      </ThemeToggle>
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
          onDisconnect={disconnect}
        />
      )}
    </AppContainer>
  );
};

export default App;