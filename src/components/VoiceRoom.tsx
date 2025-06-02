import React from 'react';
import RoomHeader from './RoomHeader';
import ParticipantsList from './ParticipantsList';
import MediaControls from './MediaControls';
import { Participant } from '../types';

interface VoiceRoomProps {
  roomName: string;
  participants: Participant[];
  localParticipant: Participant | null;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onDisconnect: () => void;
}

const VoiceRoom: React.FC<VoiceRoomProps> = ({
  roomName,
  participants,
  localParticipant,
  onToggleMute,
  onToggleVideo,
  onDisconnect,
}) => {
  const totalParticipants = participants.length + (localParticipant ? 1 : 0);
  const isVideoEnabled = localParticipant?.stream?.getVideoTracks().some(track => track.enabled) ?? false;
  
  return (
    <div className="flex flex-col h-screen">
      {/* Room header */}
      <RoomHeader 
        roomName={roomName} 
        participantCount={totalParticipants} 
      />
      
      {/* Main room area with participants */}
      <div className="flex-1 flex flex-col justify-center p-6 overflow-y-auto">
        <ParticipantsList 
          participants={participants} 
          localParticipant={localParticipant} 
        />
      </div>
      
      {/* Media controls */}
      <div className="p-6 flex justify-center">
        {localParticipant && (
          <MediaControls 
            isMuted={localParticipant.isMuted}
            isVideoEnabled={isVideoEnabled}
            onToggleMute={onToggleMute}
            onToggleVideo={onToggleVideo}
            onDisconnect={onDisconnect}
          />
        )}
      </div>
    </div>
  );
};

export default VoiceRoom;