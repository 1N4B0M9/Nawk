import React from 'react';
import { Participant } from '../types';
import ParticipantAvatar from './ParticipantAvatar';

interface ParticipantsListProps {
  participants: Participant[];
  localParticipant: Participant | null;
}

const ParticipantsList: React.FC<ParticipantsListProps> = ({
  participants,
  localParticipant,
}) => {
  // Sort participants: speaking first, then alphabetically by name
  const sortedParticipants = [...participants].sort((a, b) => {
    if (a.isSpeaking && !b.isSpeaking) return -1;
    if (!a.isSpeaking && b.isSpeaking) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto">
      <div className="w-full flex flex-wrap justify-center gap-8 mb-8">
        {/* Local participant is always shown first and larger */}
        {localParticipant && (
          <div className="flex flex-col items-center">
            <p className="text-xs text-primary-400 mb-2">You</p>
            <ParticipantAvatar 
              participant={localParticipant} 
              size="lg"
              isLocal={true}
            />
          </div>
        )}
      </div>
      
      {participants.length > 0 ? (
        <div className="w-full flex flex-wrap justify-center gap-6">
          {sortedParticipants.map((participant) => (
            <ParticipantAvatar
              key={participant.id}
              participant={participant}
              size="md"
              isLocal={false}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-400">
          <p>Waiting for others to join...</p>
          <p className="text-sm mt-2">Share the room link to invite others</p>
        </div>
      )}
    </div>
  );
};

export default ParticipantsList;