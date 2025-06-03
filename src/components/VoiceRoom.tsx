import React from 'react';
import RoomHeader from './RoomHeader';
import ParticipantsList from './ParticipantsList';
import LeaveButton from './LeaveButton';
import { Participant } from '../types';

interface VoiceRoomProps {
  roomName: string;
  participants: Participant[];
  localParticipant: Participant | null;
  onDisconnect: () => void;
}

const VoiceRoom: React.FC<VoiceRoomProps> = ({
  roomName,
  participants,
  localParticipant,
  onDisconnect,
}) => {
  const totalParticipants = participants.length + (localParticipant ? 1 : 0);
  
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

      {/* Leave call button */}
      <LeaveButton onLeave={onDisconnect} />
    </div>
  );
};

export default VoiceRoom;