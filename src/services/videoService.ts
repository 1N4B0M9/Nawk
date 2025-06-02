class VideoService {
  private videoStream: MediaStream | null = null;

  async getUserMedia(): Promise<MediaStream> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        }
      });
      
      this.videoStream = stream;
      return stream;
    } catch (error) {
      console.error('Error getting video media:', error);
      throw error;
    }
  }

  cleanup(): void {
    if (this.videoStream) {
      this.videoStream.getTracks().forEach((track) => {
        track.stop();
      });
      this.videoStream = null;
    }
  }
}

// Export as singleton
export default new VideoService(); 