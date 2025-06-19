import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { Participant } from '../types';
import socketService from '../services/socketService';
import { PhoneOff } from 'lucide-react';

const CONVERSATION_THRESHOLD = 200; // Distance threshold for conversations in pixels
const BUBBLE_DIAMETER = 150; // Bubble size in pixels
const SNAP_THRESHOLD = CONVERSATION_THRESHOLD * 0.9; // Start snapping from further away
const SNAP_STRENGTH = 0.4; // Increased snapping force
const MIN_DISTANCE = BUBBLE_DIAMETER * 1.2; // Minimum distance between bubbles

const CanvasContainer = styled.div`
  width: 100vw;
  height: 100vh;
  background: var(--color-bg);
  position: relative;
  overflow: hidden;
`;

const ConnectionLine = styled.div<{ x1: number; y1: number; x2: number; y2: number }>`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  
  &::before {
    content: '';
    position: absolute;
    top: ${props => props.y1}px;
    left: ${props => props.x1}px;
    width: ${props => Math.sqrt(Math.pow(props.x2 - props.x1, 2) + Math.pow(props.y2 - props.y1, 2))}px;
    height: 2px;
    background: rgba(76, 175, 80, 0.3);
    transform-origin: 0 0;
    transform: rotate(${props => Math.atan2(props.y2 - props.y1, props.x2 - props.x1)}rad);
  }
`;

const Bubble = styled.div<{ x: number; y: number; isDragging: boolean; isConnected: boolean }>`
  position: absolute;
  width: 150px;
  height: 150px;
  border-radius: 50%;
  background: var(--color-bg-secondary);
  cursor: grab;
  transform: translate(${props => props.x}px, ${props => props.y}px);
  transition: ${props => props.isDragging ? 'none' : 'transform 0.3s ease'};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 3px solid ${props => props.isConnected ? 'var(--color-accent)' : 'var(--color-border)'};
  box-shadow: 0 0 20px ${props => props.isConnected ? 'var(--color-accent)' : 'transparent'};
  
  &:hover {
    border-color: ${props => props.isConnected ? 'var(--color-accent-hover)' : 'var(--color-border)'};
  }

  &::before {
    content: '';
    position: absolute;
    width: ${CONVERSATION_THRESHOLD}px;
    height: ${CONVERSATION_THRESHOLD}px;
    border: 2px dashed ${props => props.isDragging ? 'var(--color-accent)' : 'transparent'};
    border-radius: 50%;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    pointer-events: none;
    transition: border-color 0.3s ease;
  }
`;

const VideoPreview = styled.video`
  width: 120px;
  height: 120px;
  border-radius: 50%;
  object-fit: cover;
  background: var(--color-border);
`;

const ParticipantName = styled.div`
  position: absolute;
  bottom: -25px;
  left: 50%;
  transform: translateX(-50%);
  color: var(--color-text);
  background: rgba(0, 0, 0, 0.2);
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
  background: ${props => props.isSpeaking ? 'var(--color-accent)' : 'var(--color-border)'};
  transition: background-color 0.2s ease;
`;

const HangupButton = styled.button`
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  z-index: 100;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 9999px;
  padding: 0.75rem;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
  
  &:hover {
    background: #dc2626;
    transform: scale(1.05);
  }
  
  &:active {
    transform: scale(0.95);
  }
`;

interface Props {
  participants: Participant[];
  localParticipant: Participant | null;
  onUpdateConnections: (connectedParticipants: string[]) => void;
  onDisconnect: () => void;
}

interface Position {
  x: number;
  y: number;
}

interface NearestBubble {
  position: Position;
  distance: number;
}

const findChainedConnections = (
  startId: string,
  positions: { [key: string]: Position },
  participants: string[],
  threshold: number
): Set<string> => {
  const connected = new Set<string>();
  const toProcess = new Set<string>([startId]);
  
  while (toProcess.size > 0) {
    const currentId = Array.from(toProcess)[0];
    toProcess.delete(currentId);
    
    if (connected.has(currentId)) continue;
    connected.add(currentId);
    
    const currentPos = positions[currentId];
    if (!currentPos) continue;
    
    // Find all participants within threshold of current participant
    participants.forEach(participantId => {
      if (participantId === currentId) return;
      
      const participantPos = positions[participantId];
      if (!participantPos) return;
      
      const distance = Math.sqrt(
        Math.pow(currentPos.x - participantPos.x, 2) +
        Math.pow(currentPos.y - participantPos.y, 2)
      );
      
      if (distance <= threshold && !connected.has(participantId)) {
        toProcess.add(participantId);
      }
    });
  }
  
  return connected;
};

const BubbleCanvas: React.FC<Props> = ({ participants, localParticipant, onUpdateConnections, onDisconnect }) => {
  const [positions, setPositions] = useState<{ [key: string]: Position }>({});
  const [dragging, setDragging] = useState<string | null>(null);
  const [connectedParticipants, setConnectedParticipants] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});
  const dragOffset = useRef<Position>({ x: 0, y: 0 });
  const animationFrame = useRef<number>();

  // Calculate the ideal snap position relative to another bubble
  const calculateIdealPosition = (targetPos: Position, anchorPos: Position): Position => {
    const dx = targetPos.x - anchorPos.x;
    const dy = targetPos.y - anchorPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < 0.1) return { x: anchorPos.x + MIN_DISTANCE, y: anchorPos.y };
    
    const angle = Math.atan2(dy, dx);
    return {
      x: anchorPos.x + Math.cos(angle) * MIN_DISTANCE,
      y: anchorPos.y + Math.sin(angle) * MIN_DISTANCE
    };
  };

  const calculateSnapPosition = (currentPos: Position, bubbleId: string, isFinalSnap: boolean = false): Position => {
    let snapX = currentPos.x;
    let snapY = currentPos.y;
    let totalForce = { x: 0, y: 0 };
    let nearestBubble: NearestBubble | null = null;

    // Get all other bubble positions
    Object.entries(positions).forEach(([id, pos]: [string, Position]) => {
      if (id === bubbleId) return;

      const dx = pos.x - currentPos.x;
      const dy = pos.y - currentPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Track nearest bubble for final snapping
      if (nearestBubble === null || distance < (nearestBubble as NearestBubble).distance) {
        nearestBubble = { position: { x: pos.x, y: pos.y }, distance };
      }

      // Strong repulsion to prevent overlap
      if (distance < MIN_DISTANCE) {
        const repulsionForce = Math.pow((MIN_DISTANCE - distance) / MIN_DISTANCE, 2) * 3.5; // Increased repulsion
        totalForce.x -= dx * repulsionForce;
        totalForce.y -= dy * repulsionForce;
      }
      // Smooth attraction within snap threshold
      else if (distance < SNAP_THRESHOLD) {
        const attractionForce = Math.pow((SNAP_THRESHOLD - distance) / SNAP_THRESHOLD, 2) * SNAP_STRENGTH;
        totalForce.x += dx * attractionForce;
        totalForce.y += dy * attractionForce;
      }
    });

    // Handle final snap when releasing bubble
    if (
      isFinalSnap &&
      nearestBubble !== null &&
      (nearestBubble as NearestBubble).distance < SNAP_THRESHOLD
    ) {
      const idealPos = calculateIdealPosition(currentPos, (nearestBubble as NearestBubble).position);
      return idealPos;
    }

    // Apply forces with smooth transition
    const forceMagnitude = Math.sqrt(totalForce.x * totalForce.x + totalForce.y * totalForce.y);
    if (forceMagnitude > 0) {
      const normalizedForce = {
        x: totalForce.x / forceMagnitude,
        y: totalForce.y / forceMagnitude
      };
      
      // Smooth force scaling with increased base strength
      const forceScale = Math.min(forceMagnitude, 15) / 15;
      snapX += normalizedForce.x * forceScale * 30; // Increased force
      snapY += normalizedForce.y * forceScale * 30;
    }

    // Constrain to container bounds
    if (containerRef.current) {
      const bounds = containerRef.current.getBoundingClientRect();
      snapX = Math.max(0, Math.min(snapX, bounds.width - BUBBLE_DIAMETER));
      snapY = Math.max(0, Math.min(snapY, bounds.height - BUBBLE_DIAMETER));
    }

    return { x: snapX, y: snapY };
  };

  // Calculate grid-based position for index
  const calculateGridPosition = (index: number): Position => {
    const containerWidth = containerRef.current?.clientWidth || window.innerWidth;
    const containerHeight = containerRef.current?.clientHeight || window.innerHeight;
    const centerX = containerWidth / 2;
    const centerY = containerHeight / 2;

    if (index === 0) {
      return {
        x: centerX - BUBBLE_DIAMETER / 2,
        y: centerY - BUBBLE_DIAMETER / 2
      };
    }

    // Calculate the number of rings needed based on total participants
    let currentRing = 1;
    let positionsInPreviousRings = 1;
    let positionsInCurrentRing = 6; // First ring holds 6 positions
    
    // Find which ring this participant belongs to
    while (positionsInPreviousRings + positionsInCurrentRing <= index) {
      positionsInPreviousRings += positionsInCurrentRing;
      currentRing++;
      positionsInCurrentRing = currentRing * 6; // Each ring can hold 6 more than the previous
    }

    // Calculate position within the current ring
    const positionInRing = index - positionsInPreviousRings;
    const totalPositionsInRing = currentRing * 6;
    const angleStep = (2 * Math.PI) / totalPositionsInRing;
    const angle = angleStep * positionInRing;

    // Calculate radius for current ring (increases linearly with ring number)
    const radius = currentRing * MIN_DISTANCE;

    return {
      x: centerX + Math.cos(angle) * radius - BUBBLE_DIAMETER / 2,
      y: centerY + Math.sin(angle) * radius - BUBBLE_DIAMETER / 2
    };
  };

  // Animate bubble movement
  const animateBubblePosition = (bubbleId: string, targetPos: Position) => {
    const currentPos = positions[bubbleId];
    if (!currentPos) return;

    const dx = targetPos.x - currentPos.x;
    const dy = targetPos.y - currentPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 0.1) {
      setPositions(prev => ({
        ...prev,
        [bubbleId]: targetPos
      }));
      return;
    }

    const newPos = {
      x: currentPos.x + dx * 0.2,
      y: currentPos.y + dy * 0.2
    };

    setPositions(prev => ({
      ...prev,
      [bubbleId]: newPos
    }));

    // Emit position update
    if (bubbleId === localParticipant?.id) {
      socketService.updatePosition(newPos);
    }

    animationFrame.current = requestAnimationFrame(() => 
      animateBubblePosition(bubbleId, targetPos)
    );
  };

  // Listen for position updates from other participants
  useEffect(() => {
    socketService.onPositionUpdate(({ userId, position }) => {
      // Immediately update position without animation for other participants
      setPositions(prev => ({
        ...prev,
        [userId]: position
      }));
    });

    // Request initial positions from all participants when joining
    if (localParticipant) {
      socketService.requestInitialPositions();
    }

    // Listen for initial positions response
    socketService.onInitialPositions((positions) => {
      setPositions(prev => ({
        ...prev,
        ...positions
      }));
    });

    return () => {
      socketService.offPositionUpdate();
      socketService.offInitialPositions();
    };
  }, [localParticipant]);

  // Initialize positions for new participants
  useEffect(() => {
    const allParticipants = [...participants];
    if (localParticipant) allParticipants.push(localParticipant);

    // Calculate positions for new participants
    allParticipants.forEach((participant, index) => {
      if (!positions[participant.id]) {
        const newPos = calculateGridPosition(index);

        // Ensure the position is within bounds
        const containerWidth = containerRef.current?.clientWidth || window.innerWidth;
        const containerHeight = containerRef.current?.clientHeight || window.innerHeight;
        
        newPos.x = Math.max(0, Math.min(newPos.x, containerWidth - BUBBLE_DIAMETER));
        newPos.y = Math.max(0, Math.min(newPos.y, containerHeight - BUBBLE_DIAMETER));

        // Apply final position with snap calculation
        const finalPos = calculateSnapPosition(newPos, participant.id);
        
        setPositions(prev => ({
          ...prev,
          [participant.id]: finalPos
        }));

        // Broadcast position update to all participants
        if (participant.id === localParticipant?.id) {
          socketService.updatePosition(finalPos);
        }
      }
    });
  }, [participants, localParticipant]);

  // Broadcast position updates when positions change
  useEffect(() => {
    if (localParticipant && positions[localParticipant.id]) {
      socketService.updatePosition(positions[localParticipant.id]);
    }
  }, [positions, localParticipant]);

  // Update connections when positions change
  useEffect(() => {
    if (!localParticipant) return;

    const localPos = positions[localParticipant.id];
    if (!localPos) return;

    // Get all participant IDs
    const allParticipantIds = participants.map(p => p.id);
    
    // Find all chained connections starting from local participant
    const connected = findChainedConnections(
      localParticipant.id,
      positions,
      allParticipantIds,
      SNAP_THRESHOLD
    );
    
    // Convert Set to array and remove local participant from the list
    const connectedArray = Array.from(connected).filter(id => id !== localParticipant.id);
    
    setConnectedParticipants(connectedArray);
    onUpdateConnections(connectedArray);
  }, [positions, participants, localParticipant]);

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

  const handleMouseDown = (e: React.MouseEvent, participantId: string) => {
    if (participantId !== localParticipant?.id) return;

    const bubble = e.currentTarget as HTMLDivElement;
    const rect = bubble.getBoundingClientRect();
    
    dragOffset.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    
    setDragging(participantId);

    // Cancel any ongoing animation
    if (animationFrame.current) {
      cancelAnimationFrame(animationFrame.current);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const rawX = e.clientX - containerRect.left - dragOffset.current.x;
    const rawY = e.clientY - containerRect.top - dragOffset.current.y;

    // Calculate snapped position
    const snappedPos = calculateSnapPosition({ x: rawX, y: rawY }, dragging);
    
    setPositions(prev => ({
      ...prev,
      [dragging]: snappedPos
    }));

    // Emit position update
    socketService.updatePosition(snappedPos);
  };

  const handleMouseUp = () => {
    if (!dragging) return;

    const currentPos = positions[dragging];
    if (currentPos) {
      // Calculate final snap position
      const finalPos = calculateSnapPosition(currentPos, dragging, true);
      
      // Animate to the final position with increased speed
      const animate = () => {
        const current = positions[dragging];
        if (!current) return;

        const dx = finalPos.x - current.x;
        const dy = finalPos.y - current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 0.5) {
          setPositions(prev => ({
            ...prev,
            [dragging]: finalPos
          }));
          socketService.updatePosition(finalPos);
          return;
        }

        const newPos = {
          x: current.x + dx * 0.3, // Increased speed for final snap
          y: current.y + dy * 0.3
        };

        setPositions(prev => ({
          ...prev,
          [dragging]: newPos
        }));
        socketService.updatePosition(newPos);

        animationFrame.current = requestAnimationFrame(animate);
      };

      animate();
    }

    setDragging(null);
  };

  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }
    };
  }, []);

  return (
    <CanvasContainer
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <HangupButton onClick={onDisconnect} title="Leave call">
        <PhoneOff size={20} />
      </HangupButton>
      
      {/* Render connection lines */}
      {connectedParticipants.map(participantId => {
        const localPos = positions[localParticipant?.id || ''];
        const participantPos = positions[participantId];
        
        if (!localPos || !participantPos) return null;

        return (
          <ConnectionLine
            key={`connection-${participantId}`}
            x1={localPos.x + BUBBLE_DIAMETER/2}
            y1={localPos.y + BUBBLE_DIAMETER/2}
            x2={participantPos.x + BUBBLE_DIAMETER/2}
            y2={participantPos.y + BUBBLE_DIAMETER/2}
          />
        );
      })}

      {/* Render bubbles */}
      {[...participants, ...(localParticipant ? [localParticipant] : [])].map(participant => {
        const isConnected = connectedParticipants.includes(participant.id) || participant.id === localParticipant?.id;
        
        return (
          <Bubble
            key={participant.id}
            x={positions[participant.id]?.x || 0}
            y={positions[participant.id]?.y || 0}
            isDragging={dragging === participant.id}
            isConnected={isConnected}
            onMouseDown={(e) => handleMouseDown(e, participant.id)}
          >
            <VideoPreview
              ref={el => videoRefs.current[participant.id] = el}
              autoPlay
              playsInline
              muted={participant.id === localParticipant?.id || !isConnected}
            />
            <ParticipantName>{participant.name}</ParticipantName>
            <SpeakingIndicator isSpeaking={participant.isSpeaking && isConnected} />
          </Bubble>
        );
      })}
    </CanvasContainer>
  );
};

export default BubbleCanvas; 