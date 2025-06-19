import React from 'react';
import { Volume2, Users } from 'lucide-react';

interface RoomHeaderProps {
  roomName: string;
  participantCount: number;
}

const RoomHeader: React.FC<RoomHeaderProps> = ({ roomName, participantCount }) => {
  return (
    <div className="flex items-center justify-between w-full p-4 bg-[var(--color-bg-secondary)]/90 backdrop-blur-sm border-b border-[var(--color-border)]">
      <div className="flex items-center space-x-2">
        <Volume2 className="text-accent" size={24} />
        <h1 className="text-xl font-semibold text-[var(--color-text)]">{roomName}</h1>
      </div>
      
      <div className="flex items-center space-x-2 text-[var(--color-text)]/70">
        <Users size={18} />
        <span className="text-sm">{participantCount} participant{participantCount !== 1 ? 's' : ''}</span>
      </div>
    </div>
  );
};

export default RoomHeader;