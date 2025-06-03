import React, { useState, useEffect } from 'react';
import { useVoiceflow } from './hooks/useVoiceflow';
import JoinForm from './components/JoinForm';
import VoiceRoom from './components/VoiceRoom';
import { Volume2 } from 'lucide-react';

function App() {
  const [roomName, setRoomName] = useState('Demo Room');
  const {
    isConnected,
    isConnecting,
    error,
    participants,
    localParticipant,
    connect,
    disconnect,
  } = useVoiceflow('room-demo-01');

  // Parse room ID from URL if present
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const roomId = searchParams.get('room');
    if (roomId) {
      setRoomName(roomId.replace(/-/g, ' '));
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background-dark via-gray-900 to-background-dark">
      {!isConnected ? (
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-lg">
            <JoinForm
              onJoin={connect}
              isConnecting={isConnecting}
              error={error}
            />
          </div>
          
          <div className="fixed bottom-4 text-center w-full">
            <div className="flex items-center justify-center space-x-2 text-gray-400 text-sm">
              <Volume2 size={16} />
              <span>Voiceflow</span>
            </div>
          </div>
        </div>
      ) : (
        <VoiceRoom
          roomName={roomName}
          participants={participants}
          localParticipant={localParticipant}
          onDisconnect={disconnect}
        />
      )}
    </div>
  );
}

export default App;