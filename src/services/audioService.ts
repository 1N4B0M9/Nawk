import { AudioProcessingOptions } from '../types';

// Define the webkitAudioContext interface for Safari compatibility
interface WindowWithWebkitAudioContext extends Window {
  webkitAudioContext?: new () => AudioContext;
}

class AudioService {
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private processingOptions: AudioProcessingOptions = {
    noiseReduction: true,
    gainControl: true,
    echoCancellation: true,
  };

  constructor() {
    this.audioContext = null;
    this.sourceNode = null;
    this.gainNode = null;
    this.analyserNode = null;
  }

  async initialize(): Promise<void> {
    try {
      const windowWithWebkit = window as WindowWithWebkitAudioContext;
      this.audioContext = new (window.AudioContext || windowWithWebkit.webkitAudioContext!)();
      console.log('Audio context initialized');
    } catch (error) {
      console.error('Failed to initialize audio context:', error);
      throw error;
    }
  }

  async getUserMedia(): Promise<MediaStream> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: this.processingOptions.echoCancellation,
          noiseSuppression: this.processingOptions.noiseReduction,
          autoGainControl: this.processingOptions.gainControl,
        },
        video: false,
      });
      
      return this.processAudioStream(stream);
    } catch (error) {
      console.error('Error getting user media:', error);
      throw error;
    }
  }

  processAudioStream(stream: MediaStream): MediaStream {
    if (!this.audioContext) {
      throw new Error('Audio context not initialized');
    }

    // Create source node from the stream
    this.sourceNode = this.audioContext.createMediaStreamSource(stream);
    
    // Create analyzer node for visualizing audio levels
    this.analyserNode = this.audioContext.createAnalyser();
    this.analyserNode.fftSize = 256;
    this.analyserNode.smoothingTimeConstant = 0.8;
    
    // Create gain node for volume control
    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = 1.0;
    
    // Connect the nodes: source -> analyser -> gain -> destination
    this.sourceNode.connect(this.analyserNode);
    this.analyserNode.connect(this.gainNode);
    
    // Create a new stream from the processed audio
    const destination = this.audioContext.createMediaStreamDestination();
    this.gainNode.connect(destination);
    
    return destination.stream;
  }

  getAudioLevel(): number {
    if (!this.analyserNode) {
      return 0;
    }
    
    const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount);
    this.analyserNode.getByteFrequencyData(dataArray);
    
    // Calculate average volume level (0-1)
    const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
    return average / 255;
  }

  setGain(level: number): void {
    if (this.gainNode) {
      // Clamp level between 0 and 2 (0 = muted, 1 = normal, 2 = boosted)
      const clampedLevel = Math.max(0, Math.min(level, 2));
      this.gainNode.gain.value = clampedLevel;
    }
  }

  softMute(isMuted: boolean): void {
    if (this.gainNode) {
      // Instead of completely muting (0), we reduce to a very low level
      // This allows for ambient awareness while effectively muting the user
      this.gainNode.gain.value = isMuted ? 0.05 : 1.0;
    }
  }

  updateProcessingOptions(options: Partial<AudioProcessingOptions>): void {
    this.processingOptions = { ...this.processingOptions, ...options };
    
    // If we already have a stream, we need to re-initialize it with new options
    if (this.sourceNode) {
      this.getUserMedia().catch(error => {
        console.error('Failed to update audio processing options:', error);
      });
    }
  }

  cleanup(): void {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
      this.sourceNode = null;
      this.gainNode = null;
      this.analyserNode = null;
    }
  }
}

// Export as singleton
export default new AudioService();