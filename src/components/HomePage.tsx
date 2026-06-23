import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { Copy, Video, ArrowRight, Users, Plus } from 'lucide-react';

const HomeContainer = styled.div`
  min-height: 100vh;
  background: var(--color-bg);
  color: var(--color-text);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 3rem;
`;

const Title = styled.h1`
  font-size: 3rem;
  font-weight: bold;
  margin-bottom: 1rem;
  background: linear-gradient(135deg, var(--color-accent), var(--color-accent-hover));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const Subtitle = styled.p`
  font-size: 1.2rem;
  color: var(--color-text-secondary);
  max-width: 600px;
  margin: 0 auto;
`;

const Card = styled.div`
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  max-width: 500px;
  width: 100%;
`;

const ModeToggle = styled.div`
  display: flex;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 4px;
  margin-bottom: 1.5rem;
`;

const ToggleButton = styled.button<{ $active: boolean }>`
  flex: 1;
  padding: 0.75rem;
  border: none;
  border-radius: 6px;
  background: ${props => props.$active ? 'var(--color-accent)' : 'transparent'};
  color: ${props => props.$active ? 'white' : 'var(--color-text-secondary)'};
  font-weight: ${props => props.$active ? '600' : '400'};
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  
  &:hover {
    background: ${props => props.$active ? 'var(--color-accent-hover)' : 'rgba(139, 92, 246, 0.1)'};
  }
`;

const Button = styled.button`
  width: 100%;
  padding: 1rem;
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
    transform: translateY(-1px);
  }
  
  &:disabled {
    background: var(--color-border);
    cursor: not-allowed;
    transform: none;
  }
`;

const Input = styled.input`
  width: 100%;
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  color: var(--color-text);
  font-size: 1rem;
  margin-bottom: 1rem;
  
  &::placeholder {
    color: var(--color-text-secondary);
  }
  
  &:focus {
    outline: none;
    border-color: var(--color-accent);
    box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.1);
  }
`;

const RoomInfo = styled.div`
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const RoomId = styled.span`
  font-family: monospace;
  font-size: 1.1rem;
  color: var(--color-accent);
  font-weight: 600;
`;

const CopyButton = styled.button`
  background: none;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 4px;
  transition: all 0.2s ease;
  
  &:hover {
    color: var(--color-accent);
    background: rgba(76, 175, 80, 0.1);
  }
`;

const Features = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-top: 2rem;
  max-width: 800px;
  width: 100%;
`;

const Feature = styled.div`
  text-align: center;
  padding: 1.5rem;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 8px;
`;

const FeatureIcon = styled.div`
  font-size: 2rem;
  margin-bottom: 1rem;
  color: var(--color-accent);
`;

const FeatureTitle = styled.h3`
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
`;

const FeatureDescription = styled.p`
  color: var(--color-text-secondary);
  font-size: 0.9rem;
`;

type Mode = 'create' | 'join';

const HomePage: React.FC = () => {
  const [mode, setMode] = useState<Mode>('create');
  const [userName, setUserName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [createdRoomId, setCreatedRoomId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  const generateRoomId = () => {
    // Generate a short, readable room ID
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 6);
    return `${timestamp}-${random}`;
  };

  const createRoom = () => {
    if (!userName.trim()) return;
    
    const roomId = generateRoomId();
    setCreatedRoomId(roomId);
  };

  const joinRoom = () => {
    if (!userName.trim() || !roomCode.trim()) return;
    
    navigate(`/room/${roomCode.trim()}`, { 
      state: { userName, isHost: false } 
    });
  };

  const joinCreatedRoom = () => {
    if (!userName.trim() || !createdRoomId) return;
    
    navigate(`/room/${createdRoomId}`, { 
      state: { userName, isHost: true } 
    });
  };

  const copyRoomLink = async () => {
    if (!createdRoomId) return;
    
    try {
      await navigator.clipboard.writeText(createdRoomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy room code:', err);
    }
  };

  const handleModeChange = (newMode: Mode) => {
    setMode(newMode);
    setCreatedRoomId(null);
    setRoomCode('');
    setCopied(false);
  };

  const isFormValid = () => {
    if (mode === 'create') {
      return userName.trim() && (!createdRoomId || userName.trim());
    } else {
      return userName.trim() && roomCode.trim();
    }
  };

  return (
    <HomeContainer>
      <Header>
        <Title>NawkNawk</Title>
        <Subtitle>
          Create private video rooms for seamless conversations. 
          Drag and drop to connect with others in real-time.
        </Subtitle>
      </Header>

      <Card>
        <ModeToggle>
          <ToggleButton 
            $active={mode === 'create'} 
            onClick={() => handleModeChange('create')}
          >
            <Plus size={16} />
            Create Room
          </ToggleButton>
          <ToggleButton 
            $active={mode === 'join'} 
            onClick={() => handleModeChange('join')}
          >
            <Users size={16} />
            Join Room
          </ToggleButton>
        </ModeToggle>

        {mode === 'create' ? (
          <>
            {!createdRoomId ? (
              <>
                <Input
                  type="text"
                  placeholder="Enter your name"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && createRoom()}
                />
                <Button 
                  onClick={createRoom}
                  disabled={!userName.trim()}
                >
                  <Video size={20} />
                  Create New Room
                </Button>
              </>
            ) : (
              <>
                <RoomInfo>
                  <div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginBottom: '0.25rem' }}>
                      Room ID
                    </div>
                    <RoomId>{createdRoomId}</RoomId>
                  </div>
                  <CopyButton onClick={copyRoomLink} title="Copy room link">
                    <Copy size={16} />
                  </CopyButton>
                </RoomInfo>
                {copied && (
                  <div style={{ 
                    textAlign: 'center', 
                    color: 'var(--color-accent)', 
                    fontSize: '0.9rem',
                    marginBottom: '1rem'
                  }}>
                    Room link copied to clipboard!
                  </div>
                )}
                <Button onClick={joinCreatedRoom}>
                  <ArrowRight size={20} />
                  Join Room
                </Button>
              </>
            )}
          </>
        ) : (
          <>
            <Input
              type="text"
              placeholder="Enter your name"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && joinRoom()}
            />
            <Input
              type="text"
              placeholder="Enter room code"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && joinRoom()}
            />
            <Button 
              onClick={joinRoom}
              disabled={!isFormValid()}
            >
              <ArrowRight size={20} />
              Join Room
            </Button>
          </>
        )}
      </Card>

      <Features>
        <Feature>
          <FeatureIcon>🎥</FeatureIcon>
          <FeatureTitle>Real-time Video</FeatureTitle>
          <FeatureDescription>
            High-quality video calls with automatic connection management
          </FeatureDescription>
        </Feature>
        <Feature>
          <FeatureIcon>🎯</FeatureIcon>
          <FeatureTitle>Proximity-based</FeatureTitle>
          <FeatureDescription>
            Drag bubbles to connect with nearby participants
          </FeatureDescription>
        </Feature>
        <Feature>
          <FeatureIcon>🔒</FeatureIcon>
          <FeatureTitle>Private Rooms</FeatureTitle>
          <FeatureDescription>
            Secure rooms with unique IDs and participant limits
          </FeatureDescription>
        </Feature>
      </Features>
    </HomeContainer>
  );
};

export default HomePage; 