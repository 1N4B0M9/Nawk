class VideoService {
  private stream: MediaStream | null = null;
  private hasAccess: boolean = false;

  async getUserMedia(): Promise<MediaStream> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        }
      });
      this.hasAccess = true;
      return this.stream;
    } catch (error) {
      console.warn('Could not access camera:', error);
      this.hasAccess = false;
      // Return an empty MediaStream when camera access is not available
      return new MediaStream();
    }
  }

  hasVideoAccess(): boolean {
    return this.hasAccess;
  }

  cleanup(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => {
        track.stop();
      });
      this.stream = null;
    }
    this.hasAccess = false;
  }
}

// Export as singleton
export default new VideoService(); 