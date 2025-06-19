import React, { useRef, useEffect } from 'react';
import { User, Mic, MicOff } from 'lucide-react';
import { Participant } from '../types';

interface ParticipantAvatarProps {
  participant: Participant;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
  isLocal?: boolean;
}

const ParticipantAvatar: React.FC<ParticipantAvatarProps> = ({
  participant,
  size = 'md',
  showName = true,
  isLocal = false,
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Size classes based on the size prop
  const sizeClasses = {
    sm: 'w-10 h-10 text-xs',
    md: 'w-16 h-16 text-sm',
    lg: 'w-24 h-24 text-base',
  }[size];
  
  // Connect remote media stream to audio and video elements
  useEffect(() => {
    if (!participant.stream) {
      if (audioRef.current) {
        audioRef.current.srcObject = null;
        audioRef.current.pause();
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.pause();
      }
      return;
    }

    console.log(`Setting up media for ${participant.name}`, {
      isLocal,
      hasAudio: participant.stream.getAudioTracks().length > 0,
      hasVideo: participant.stream.getVideoTracks().length > 0,
      audioTracks: participant.stream.getAudioTracks().map(t => ({ enabled: t.enabled })),
      videoTracks: participant.stream.getVideoTracks().map(t => ({ enabled: t.enabled }))
    });

    // For remote participants, set up audio
    if (!isLocal && audioRef.current) {
      const audioStream = new MediaStream(participant.stream.getAudioTracks());
      audioRef.current.srcObject = audioStream;
      audioRef.current.muted = false;
      
      const playAudio = async () => {
        try {
          await audioRef.current?.play();
        } catch (err) {
          console.warn('Failed to play audio, waiting for user interaction');
          const playOnClick = () => {
            audioRef.current?.play().catch(console.error);
            document.removeEventListener('click', playOnClick);
          };
          document.addEventListener('click', playOnClick);
        }
      };
      playAudio();
    }

    // Set up video for both local and remote participants
    if (videoRef.current) {
      const videoStream = new MediaStream(participant.stream.getVideoTracks());
      videoRef.current.srcObject = videoStream;
      videoRef.current.muted = true; // Always mute video element
      
      const playVideo = async () => {
        try {
          await videoRef.current?.play();
        } catch (err) {
          console.warn('Failed to play video, waiting for user interaction');
          const playOnClick = () => {
            videoRef.current?.play().catch(console.error);
            document.removeEventListener('click', playOnClick);
          };
          document.addEventListener('click', playOnClick);
        }
      };
      playVideo();
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.srcObject = null;
        audioRef.current.pause();
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.pause();
      }
    };
  }, [participant.stream, isLocal, participant.name]);

  // Check if there are enabled video tracks
  const hasVideoTrack = participant.stream?.getVideoTracks().some(track => track.enabled) ?? false;

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        {/* Voice indicator (shows when speaking) */}
        <div className={`voice-indicator ${participant.isSpeaking ? 'speaking' : ''}`} />
        
        {/* Participant video/avatar circle */}
        <div 
          className={`${sizeClasses} rounded-full bg-[var(--color-bg-secondary)] flex items-center justify-center relative overflow-hidden transition-all duration-300 ${
            participant.isSpeaking ? 'ring-2 ring-accent' : ''
          }`}
        >
          {hasVideoTrack ? (
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              autoPlay
              muted
            />
          ) : (
            <User className="text-[var(--color-text)]" size={size === 'lg' ? 36 : size === 'md' ? 24 : 16} />
          )}
          
          {/* Audio level indicator (subtle background gradient) */}
          <div 
            className="absolute inset-0 bg-gradient-to-t from-accent to-transparent opacity-50 transition-all duration-200"
            style={{ height: `${participant.audioLevel * 100}%` }}
          />
          
          {/* Mute indicator */}
          {participant.isMuted && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <MicOff className="text-white/80" size={size === 'lg' ? 24 : size === 'md' ? 18 : 14} />
            </div>
          )}
        </div>
      </div>
      
      {/* Participant name */}
      {showName && (
        <div className="mt-2 flex items-center space-x-1">
          <span className="text-sm font-medium truncate max-w-[100px] text-[var(--color-text)]">
            {participant.name}
          </span>
          {participant.isMuted ? (
            <MicOff className="text-red-500" size={14} />
          ) : (
            <Mic className="text-green-500" size={14} />
          )}
        </div>
      )}
      
      {/* Hidden audio element for remote participants */}
      {!isLocal && <audio ref={audioRef} autoPlay playsInline />}
    </div>
  );
};

export default ParticipantAvatar;