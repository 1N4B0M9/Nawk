import React from 'react';
import { Mic, MicOff, PhoneOff, Settings, Video, VideoOff } from 'lucide-react';

interface MediaControlsProps {
  isMuted: boolean;
  isVideoEnabled: boolean;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onDisconnect: () => void;
  onOpenSettings?: () => void;
}

const MediaControls: React.FC<MediaControlsProps> = ({
  isMuted,
  isVideoEnabled,
  onToggleMute,
  onToggleVideo,
  onDisconnect,
  onOpenSettings,
}) => {
  return (
    <div className="flex items-center justify-center space-x-4 p-4 bg-background-dark/80 backdrop-blur-sm rounded-full shadow-lg">
      {/* Mute/Unmute button */}
      <button
        onClick={onToggleMute}
        className={`p-3 rounded-full transition-all duration-300 ${
          isMuted 
            ? 'bg-red-500 hover:bg-red-600 text-white' 
            : 'bg-green-500 hover:bg-green-600 text-white'
        }`}
        title={isMuted ? 'Unmute' : 'Mute'}
      >
        {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
      </button>

      {/* Video toggle button */}
      <button
        onClick={onToggleVideo}
        className={`p-3 rounded-full transition-all duration-300 ${
          isVideoEnabled 
            ? 'bg-green-500 hover:bg-green-600 text-white' 
            : 'bg-red-500 hover:bg-red-600 text-white'
        }`}
        title={isVideoEnabled ? 'Turn off video' : 'Turn on video'}
      >
        {isVideoEnabled ? <Video size={24} /> : <VideoOff size={24} />}
      </button>
      
      {/* Disconnect button */}
      <button
        onClick={onDisconnect}
        className="p-3 bg-red-500 hover:bg-red-600 text-white rounded-full transition-all duration-300"
        title="Leave call"
      >
        <PhoneOff size={24} />
      </button>
      
      {/* Settings button (optional) */}
      {onOpenSettings && (
        <button
          onClick={onOpenSettings}
          className="p-3 bg-gray-700 hover:bg-gray-600 text-white rounded-full transition-all duration-300"
          title="Media settings"
        >
          <Settings size={24} />
        </button>
      )}
    </div>
  );
};

export default MediaControls;