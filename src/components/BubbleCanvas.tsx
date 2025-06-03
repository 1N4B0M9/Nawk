import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { Participant } from '../types';
import socketService from '../services/socketService';

const CanvasContainer = styled.div`
  width: 100vw;
  height: 100vh;
  background: #1a1a1a;
  position: relative;
  overflow: hidden;
`;

const Bubble = styled.div<{ x: number; y: number; isDragging: boolean }>`
  position: absolute;
  width: 150px;
  height: 150px;
  border-radius: 50%;
  background: #2a2a2a;
  cursor: grab;
  transform: translate(${props => props.x}px, ${props => props.y}px);
  transition: ${props => props.isDragging ? 'none' : 'transform 0.3s ease'};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 2px solid ${props => props.isDragging ? '#4CAF50' : '#3a3a3a'};
  
  &:hover {
    border-color: #4CAF50;
  }
`;

const VideoPreview = styled.video`
  width: 120px;
  height: 120px;
  border-radius: 50%;
  object-fit: cover;
  background: #3a3a3a;
`;

const ParticipantName = styled.div`
  position: absolute;
  bottom: -25px;
  left: 50%;
  transform: translateX(-50%);
  color: white;
  background: rgba(0, 0, 0, 0.5);
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.9rem;
  white-space: nowrap;
`;

const SpeakingIndicator = styled.div<{ isSpeaking: boolean }>`
  position: absolute;
  top: 5px;
  right: 5px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${props => props.isSpeaking ? '#4CAF50' : '#666'};
  transition: background-color 0.2s ease;
`;

interface Props {
  participants: Participant[];
  localParticipant: Participant | null;
}

interface Position {
  x: number;
  y: number;
}

const BubbleCanvas: React.FC<Props> = ({ participants, localParticipant }) => {
  const [positions, setPositions] = useState<{ [key: string]: Position }>({});
  const [dragging, setDragging] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});
  const dragOffset = useRef<Position>({ x: 0, y: 0 });

  // Initialize random positions for new participants
  useEffect(() => {
    const allParticipants = [...participants];
    if (localParticipant) allParticipants.push(localParticipant);

    allParticipants.forEach(participant => {
      if (!positions[participant.id]) {
        const containerWidth = containerRef.current?.clientWidth || window.innerWidth;
        const containerHeight = containerRef.current?.clientHeight || window.innerHeight;
        
        setPositions(prev => ({
          ...prev,
          [participant.id]: {
            x: Math.random() * (containerWidth - 150),
            y: Math.random() * (containerHeight - 150)
          }
        }));
      }
    });
  }, [participants, localParticipant]);

  // Set up video streams
  useEffect(() => {
    const allParticipants = [...participants];
    if (localParticipant) allParticipants.push(localParticipant);

    allParticipants.forEach(participant => {
      if (participant.stream && videoRefs.current[participant.id]) {
        const videoElement = videoRefs.current[participant.id];
        if (videoElement && videoElement.srcObject !== participant.stream) {
          videoElement.srcObject = participant.stream;
        }
      }
    });
  }, [participants, localParticipant]);

  // Listen for position updates from other participants
  useEffect(() => {
    socketService.onPositionUpdate(({ userId, position }) => {
      setPositions(prev => ({
        ...prev,
        [userId]: position
      }));
    });
  }, []);

  const handleMouseDown = (e: React.MouseEvent, participantId: string) => {
    if (participantId !== localParticipant?.id) return;

    const bubble = e.currentTarget as HTMLDivElement;
    const rect = bubble.getBoundingClientRect();
    
    dragOffset.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    
    setDragging(participantId);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const newX = e.clientX - containerRect.left - dragOffset.current.x;
    const newY = e.clientY - containerRect.top - dragOffset.current.y;

    // Constrain to container bounds
    const constrainedX = Math.max(0, Math.min(newX, containerRect.width - 150));
    const constrainedY = Math.max(0, Math.min(newY, containerRect.height - 150));

    const newPosition = { x: constrainedX, y: constrainedY };
    
    setPositions(prev => ({
      ...prev,
      [dragging]: newPosition
    }));

    // Emit position update
    socketService.updatePosition(newPosition);
  };

  const handleMouseUp = () => {
    setDragging(null);
  };

  return (
    <CanvasContainer
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {[...participants, ...(localParticipant ? [localParticipant] : [])].map(participant => (
        <Bubble
          key={participant.id}
          x={positions[participant.id]?.x || 0}
          y={positions[participant.id]?.y || 0}
          isDragging={dragging === participant.id}
          onMouseDown={(e) => handleMouseDown(e, participant.id)}
        >
          <VideoPreview
            ref={el => videoRefs.current[participant.id] = el}
            autoPlay
            playsInline
            muted={participant.id === localParticipant?.id}
          />
          <ParticipantName>{participant.name}</ParticipantName>
          <SpeakingIndicator isSpeaking={participant.isSpeaking} />
        </Bubble>
      ))}
    </CanvasContainer>
  );
};

export default BubbleCanvas; 