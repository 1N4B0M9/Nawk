# NawkNawk - Audio-Only Meeting App

NawkNawk is a lightweight, browser-based WebRTC voice meeting app focused on reducing awkwardness in virtual calls. It provides an audio-only experience optimized for casual conversations with smart voice flow features.

## Features

- **Real-time peer-to-peer audio** using simple-peer and socket.io for signaling
- **Audio-only experience** optimized for casual conversations
- **Smart voice flow** with soft mute system and visual speaking indicators
- **Voice prioritization** to smoothly handle overlapping speech
- **Audio processing** to filter background noise and enhance clarity
- **Clean UI** built with React and Tailwind CSS

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm or yarn

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/nawknawk.git
cd nawknawk
```

2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

4. In a separate terminal, start the signaling server:

```bash
node public/room-server.js
```

### Usage

1. Open your browser to the local development server (usually http://localhost:5173)
2. Enter your name and join the default room
3. Share the URL with others to join the same room
4. Enjoy natural conversations with visual speaking indicators

## Project Structure

- `src/components/` - React components
- `src/services/` - WebRTC, Socket.io, and Audio processing services
- `src/hooks/` - Custom React hooks
- `src/types/` - TypeScript type definitions
- `public/room-server.js` - Simple signaling server for demonstration

## Deployment

For production deployment, you'll need to:

1. Build the client application:

```bash
npm run build
```

2. Deploy the client to a static hosting service (Netlify, Vercel, etc.)
3. Deploy the signaling server to a Node.js hosting service (Heroku, AWS, etc.)

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [simple-peer](https://github.com/feross/simple-peer) for WebRTC
- [socket.io](https://socket.io/) for signaling
- [React](https://reactjs.org/) and [Tailwind CSS](https://tailwindcss.com/) for the UI