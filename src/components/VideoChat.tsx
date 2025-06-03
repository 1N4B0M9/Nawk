import React, { useEffect, useRef } from 'react';
import webRTCService from '../services/webRTCService';
import videoService from '../services/videoService';
import { Participant } from '../types';
import styled from 'styled-components';

const VideoChatContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
  padding: 1rem;
  height: 100vh;
  background: #1a1a1a;
`;

const ParticipantContainer = styled.div`
  position: relative;
  background: #2a2a2a;
  border-radius: 8px;
  overflow: hidden;
  aspect-ratio: 16/9;
`;

const Video = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const Avatar = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #3a3a3a;
  color: white;
  font-size: 2rem;
  font-weight: bold;
`;

const ParticipantName = styled.div`
  position: absolute;
  bottom: 1rem;
  left: 1rem;
  color: white;
  background: rgba(0, 0, 0, 0.5);
  padding: 0.5rem;
  border-radius: 4px;
  font-size: 0.9rem;
`;

const SpeakingIndicator = styled.div<{ isSpeaking: boolean }>`
  position: absolute;
  top: 1rem;
  right: 1rem;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${(props: { isSpeaking: boolean }) => props.isSpeaking ? '#4CAF50' : '#666'};
  transition: background-color 0.2s ease;
`;

interface Props {
  participants: Participant[];
}

const VideoChat: React.FC<Props> = ({ participants }) => {
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});

  useEffect(() => {
    participants.forEach(participant => {
      if (participant.stream && videoRefs.current[participant.id]) {
        const videoElement = videoRefs.current[participant.id];
        if (videoElement && videoElement.srcObject !== participant.stream) {
          videoElement.srcObject = participant.stream;
        }
      }
    });
  }, [participants]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };

  return (
    <VideoChatContainer>
      {participants.map(participant => (
        <ParticipantContainer key={participant.id}>
          {participant.stream?.getVideoTracks().length ? (
            <Video
              ref={(el: HTMLVideoElement | null) => videoRefs.current[participant.id] = el}
              autoPlay
              playsInline
              muted={participant.id === webRTCService.getLocalParticipant()?.id}
            />
          ) : (
            <Avatar>{getInitials(participant.name)}</Avatar>
          )}
          <ParticipantName>{participant.name}</ParticipantName>
          <SpeakingIndicator isSpeaking={participant.isSpeaking} />
        </ParticipantContainer>
      ))}
    </VideoChatContainer>
  );
};

export default VideoChat; 