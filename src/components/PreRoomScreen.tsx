import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { Mic, MicOff, Video, VideoOff, AlertCircle, CheckCircle, SkipForward } from 'lucide-react';
import audioService from '../services/audioService';
import videoService from '../services/videoService';

const Container = styled.div`
  width: 100vw;
  height: 100vh;
  background: var(--color-bg);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
`;

const Card = styled.div`
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  padding: 2rem;
  max-width: 600px;
  width: 100%;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
`;

const Title = styled.h2`
  color: var(--color-text);
  margin-bottom: 0.5rem;
  font-size: 1.5rem;
`;

const Subtitle = styled.p`
  color: var(--color-text-secondary);
  margin-bottom: 2rem;
  font-size: 0.9rem;
`;

const MediaGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-bottom: 2rem;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const MediaCard = styled.div<{ $status: 'pending' | 'denied' | 'granted' }>`
  border: 2px solid ${props => {
    if (props.$status === 'granted') return 'var(--color-accent)';
    if (props.$status === 'denied') return '#ef4444';
    return 'var(--color-border)';
  }};
  border-radius: 12px;
  padding: 1.5rem;
  background: ${props => props.$status === 'granted' ? 'rgba(76, 175, 80, 0.1)' : 'transparent'};
`;

const MediaHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
`;

const MediaIcon = styled.div<{ $status: 'pending' | 'denied' | 'granted' }>`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${props => {
    if (props.$status === 'granted') return 'var(--color-accent)';
    if (props.$status === 'denied') return '#ef4444';
    return 'var(--color-bg-secondary)';
  }};
  color: white;
`;

const MediaTitle = styled.div`
  font-weight: 600;
  color: var(--color-text);
`;

const MediaStatus = styled.div<{ $status: 'pending' | 'denied' | 'granted' }>`
  font-size: 0.85rem;
  color: ${props => {
    if (props.$status === 'granted') return 'var(--color-accent)';
    if (props.$status === 'denied') return '#ef4444';
    return 'var(--color-text-secondary)';
  }};
  margin-top: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const VideoPreview = styled.video`
  width: 100%;
  max-width: 300px;
  border-radius: 8px;
  background: var(--color-border);
  margin: 0.5rem 0;
`;

const AudioMeter = styled.div`
  width: 100%;
  height: 40px;
  background: var(--color-bg);
  border-radius: 8px;
  overflow: hidden;
  margin: 0.5rem 0;
  position: relative;
`;

const AudioLevel = styled.div<{ $level: number }>`
  height: 100%;
  background: linear-gradient(to right, var(--color-accent), #4caf50);
  width: ${props => props.$level}%;
  transition: width 0.1s ease;
  border-radius: 8px;
`;

const Button = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  border: none;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
  
  ${props => props.$variant === 'primary' ? `
    background: var(--color-accent);
    color: white;
    &:hover {
      background: var(--color-accent-hover);
    }
  ` : `
    background: var(--color-bg);
    color: var(--color-text);
    border: 1px solid var(--color-border);
    &:hover {
      background: var(--color-bg-secondary);
    }
  `}
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
`;

const AlertBox = styled.div`
  background: #fef3c7;
  border: 1px solid #fbbf24;
  color: #92400e;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: start;
  gap: 0.75rem;
  font-size: 0.9rem;
`;

interface PreRoomScreenProps {
  userName: string;
  roomId: string;
  isHost?: boolean;
  onJoin: (permissions: { hasMic: boolean; hasCamera: boolean }) => void;
  onBack?: () => void;
}

const PreRoomScreen: React.FC<PreRoomScreenProps> = ({
  onJoin,
  onBack,
}) => {
  const [micPermission, setMicPermission] = useState<'pending' | 'denied' | 'granted'>('pending');
  const [cameraPermission, setCameraPermission] = useState<'pending' | 'denied' | 'granted'>('pending');
  const [audioLevel, setAudioLevel] = useState(0);
  const [isTesting, setIsTesting] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>();
  const localVideoStreamRef = useRef<MediaStream | null>(null);
  const localAudioStreamRef = useRef<MediaStream | null>(null);

  // Check initial permission states
  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    try {
      // Check mic permission
      const micPermissionState = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      if (micPermissionState.state === 'granted') {
        setMicPermission('granted');
      } else if (micPermissionState.state === 'denied') {
        setMicPermission('denied');
      }
    } catch {
      console.log('Mic permission check not supported');
    }

    try {
      // Check camera permission
      const cameraPermissionState = await navigator.permissions.query({ name: 'camera' as PermissionName });
      if (cameraPermissionState.state === 'granted') {
        setCameraPermission('granted');
      } else if (cameraPermissionState.state === 'denied') {
        setCameraPermission('denied');
      }
    } catch {
      console.log('Camera permission check not supported');
    }
  };

  const requestMicPermission = async () => {
    try {
      setIsTesting(true);
      await audioService.initialize();
      const stream = await audioService.getUserMedia();
      
      if (stream.getAudioTracks().length > 0) {
        setMicPermission('granted');
        localAudioStreamRef.current = stream;
        
        // Start audio level monitoring
        startAudioLevelMonitoring(stream);
      } else {
        setMicPermission('denied');
      }
    } catch (error) {
      console.error('Failed to get mic permission:', error);
      setMicPermission('denied');
    } finally {
      setIsTesting(false);
    }
  };

  const requestCameraPermission = async () => {
    try {
      setIsTesting(true);
      const stream = await videoService.getUserMedia();

      if (stream.getVideoTracks().length > 0) {
        setCameraPermission('granted');
        localVideoStreamRef.current = stream;
      } else {
        setCameraPermission('denied');
      }
    } catch (error) {
      console.error('Failed to get camera permission:', error);
      setCameraPermission('denied');
    } finally {
      setIsTesting(false);
    }
  };

  useEffect(() => {
    if (cameraPermission === 'granted' && localVideoStreamRef.current && videoRef.current) {
      videoRef.current.srcObject = localVideoStreamRef.current;
      void videoRef.current.play();
    }
  }, [cameraPermission]);

  const startAudioLevelMonitoring = (stream: MediaStream) => {
    if (!stream.getAudioTracks().length) return;

    try {
      const AudioContextCtor = window.AudioContext
        || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextCtor) return;

      const audioContext = new AudioContextCtor();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const monitor = () => {
        if (!analyserRef.current) return;

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        
        const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
        const normalizedLevel = average / 255;
        
        setAudioLevel(normalizedLevel);
        
        animationFrameRef.current = requestAnimationFrame(monitor);
      };
      
      monitor();
    } catch (error) {
      console.error('Failed to start audio monitoring:', error);
    }
  };

  const handleJoin = () => {
    // Stop all tracks
    localVideoStreamRef.current?.getTracks().forEach(track => track.stop());
    localAudioStreamRef.current?.getTracks().forEach(track => track.stop());
    
    // Stop animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    // Cleanup audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }

    // Pass permission states to parent
    onJoin({
      hasMic: micPermission === 'granted',
      hasCamera: cameraPermission === 'granted',
    });
  };

  const bothDenied = micPermission === 'denied' && cameraPermission === 'denied';

  return (
    <Container>
      <Card>
        <Title>Test Your Media</Title>
        <Subtitle>
          {bothDenied 
            ? 'Enable your microphone or camera to participate fully in the voice room'
            : 'Enable your microphone and camera to get the best experience'
          }
        </Subtitle>

        {bothDenied && (
          <AlertBox>
            <AlertCircle size={18} />
            <div>
              <strong>No permissions granted</strong>
              <br />
              You can still join, but others won't be able to hear or see you. 
              You'll only be able to listen and watch.
            </div>
          </AlertBox>
        )}

        <MediaGrid>
          {/* Microphone Card */}
          <MediaCard $status={micPermission}>
            <MediaHeader>
              <MediaIcon $status={micPermission}>
                {micPermission === 'granted' ? <Mic size={20} /> : <MicOff size={20} />}
              </MediaIcon>
              <MediaTitle>Microphone</MediaTitle>
            </MediaHeader>
            
            <MediaStatus $status={micPermission}>
              {micPermission === 'granted' && (
                <>
                  <CheckCircle size={14} />
                  Permission granted
                </>
              )}
              {micPermission === 'denied' && (
                <>
                  <AlertCircle size={14} />
                  Permission denied
                </>
              )}
              {micPermission === 'pending' && 'Click to test'}
            </MediaStatus>

            {micPermission === 'granted' && (
              <div style={{ marginTop: '0.5rem' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '0.25rem' }}>
                  Audio Level
                </div>
                <AudioMeter>
                  <AudioLevel $level={audioLevel * 100} />
                </AudioMeter>
              </div>
            )}

            {micPermission === 'granted' ? (
              <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--color-accent)' }}>
                ✓ Working correctly
              </div>
            ) : micPermission === 'denied' ? (
              <div style={{ marginTop: '0.75rem' }}>
                <div style={{ fontSize: '0.8rem', color: '#ef4444', marginBottom: '0.5rem' }}>
                  Permission denied. Click retry to try again.
                </div>
                <Button
                  onClick={requestMicPermission}
                  disabled={isTesting}
                  $variant="secondary"
                  style={{ width: '100%' }}
                >
                  Retry Microphone
                </Button>
              </div>
            ) : (
              <Button
                onClick={requestMicPermission}
                disabled={isTesting}
                $variant="secondary"
                style={{ width: '100%', marginTop: '0.75rem' }}
              >
                Enable Microphone
              </Button>
            )}
          </MediaCard>

          {/* Camera Card */}
          <MediaCard $status={cameraPermission}>
            <MediaHeader>
              <MediaIcon $status={cameraPermission}>
                {cameraPermission === 'granted' ? <Video size={20} /> : <VideoOff size={20} />}
              </MediaIcon>
              <MediaTitle>Camera</MediaTitle>
            </MediaHeader>
            
            <MediaStatus $status={cameraPermission}>
              {cameraPermission === 'granted' && (
                <>
                  <CheckCircle size={14} />
                  Permission granted
                </>
              )}
              {cameraPermission === 'denied' && (
                <>
                  <AlertCircle size={14} />
                  Permission denied
                </>
              )}
              {cameraPermission === 'pending' && 'Click to test'}
            </MediaStatus>

            {cameraPermission === 'granted' && (
              <VideoPreview ref={videoRef} autoPlay playsInline muted />
            )}

            {cameraPermission === 'granted' ? (
              <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--color-accent)' }}>
                ✓ Working correctly
              </div>
            ) : cameraPermission === 'denied' ? (
              <div style={{ marginTop: '0.75rem' }}>
                <div style={{ fontSize: '0.8rem', color: '#ef4444', marginBottom: '0.5rem' }}>
                  Permission denied. Click retry to try again.
                </div>
                <Button
                  onClick={requestCameraPermission}
                  disabled={isTesting}
                  $variant="secondary"
                  style={{ width: '100%' }}
                >
                  Retry Camera
                </Button>
              </div>
            ) : (
              <Button
                onClick={requestCameraPermission}
                disabled={isTesting}
                $variant="secondary"
                style={{ width: '100%', marginTop: '0.75rem' }}
              >
                Enable Camera
              </Button>
            )}
          </MediaCard>
        </MediaGrid>

        <ButtonGroup>
          {onBack && (
            <Button onClick={onBack} $variant="secondary">
              Back
            </Button>
          )}
          <Button
            onClick={handleJoin}
            $variant="primary"
            style={{ flex: 1 }}
          >
            {bothDenied ? (
              <>
                <SkipForward size={18} />
                Join Anyway
              </>
            ) : (
              'Join Room'
            )}
          </Button>
        </ButtonGroup>
      </Card>
    </Container>
  );
};

export default PreRoomScreen;


