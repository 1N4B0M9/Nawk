# NawkNawk

NawkNawk is a browser-based video and voice meeting app built around proximity-based conversations. Participants appear as draggable bubbles on a canvas; audio and video connect only when bubbles are close enough to form a conversation chain.

## Features

- **Real-time peer-to-peer media** via PeerJS (mesh WebRTC)
- **Room signaling and presence** via Socket.IO
- **Proximity-based audio** — drag your bubble near others to hear and be heard
- **Pre-room media check** — test microphone and camera before joining
- **Private rooms** with shareable IDs and a 15-participant cap
- **Speaking indicators** and permission badges (no mic / no camera)
- **Light and dark theme** toggle

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite |
| Styling | styled-components, Tailwind CSS (base styles) |
| WebRTC | PeerJS |
| Signaling | Socket.IO |
| Server | Node.js (`http` + Socket.IO), serves built SPA from `dist/` |
| Deployment | Docker, Fly.io |

## Architecture

```
HomePage → Room → PreRoomScreen (media check) → BubbleCanvas (in-call UI)
                      ↓
                 useNawkNawk hook
                      ↓
              webRTCService ──→ audioService / videoService
                      ↓
              socketService ──→ room-server.cjs (Socket.IO + static files)
                      ↓
              PeerJS mesh ──→ other participants
```

- **Socket.IO** handles room join/leave, participant lists, and bubble position sync.
- **PeerJS** handles direct peer-to-peer audio/video between participants.
- **Proximity logic** in `BubbleCanvas` determines which remote audio tracks are enabled.

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
git clone <your-repo-url>
cd nawknawk
npm install
```

### Development

Run the Vite dev server and the signaling server in separate terminals:

```bash
# Terminal 1 — frontend (http://localhost:5173)
npm run dev

# Terminal 2 — signaling + static server (http://localhost:3000)
npm run start-server
```

Open http://localhost:5173, create or join a room, test your media, and enter the bubble canvas.

### Usage

1. Enter your name on the home page and create or join a room.
2. On the pre-room screen, enable microphone and/or camera (or join without them).
3. Drag your bubble near others to start a conversation.
4. Share the room ID so others can join the same room.

## Project Structure

```
src/
├── components/
│   ├── HomePage.tsx       # Create/join room landing page
│   ├── Room.tsx           # Room orchestration and join flow
│   ├── PreRoomScreen.tsx  # Pre-join media permission check
│   └── BubbleCanvas.tsx   # In-call bubble UI and proximity logic
├── hooks/
│   └── useNawkNawk.ts     # Room connection state hook
├── services/
│   ├── webRTCService.ts   # PeerJS mesh, participants, VAD
│   ├── socketService.ts   # Socket.IO client
│   ├── audioService.ts    # Mic capture and audio processing
│   └── videoService.ts    # Camera capture
└── types/
    └── index.ts           # Shared TypeScript types

public/
└── room-server.cjs        # Production server (static files + Socket.IO)
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Build frontend to `dist/` |
| `npm run preview` | Preview production build locally |
| `npm run start-server` | Run signaling/static server on port 3000 |
| `npm run lint` | Run ESLint |

## Environment Variables

### Client (`.env`)

Optional TURN server for NAT traversal in production:

```env
VITE_TURN_URL=turn:your-turn-server.example.com
VITE_TURN_USERNAME=your-username
VITE_TURN_CREDENTIAL=your-credential
```

If unset, only a public STUN server is used (`stun.l.google.com`).

### Server

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server listen port |
| `CORS_ORIGIN` | `*` | Socket.IO CORS origin (set to your domain in production) |

## Deployment

The app ships as a single Docker image that builds the Vite frontend and runs `room-server.cjs`, which serves `dist/` and handles Socket.IO signaling.

```bash
npm run build
npm run start-server   # serves dist/ from project root after build
```

For Fly.io deployment details, see [DEPLOYMENT.md](./DEPLOYMENT.md).  
For room/signaling protocol details, see [ROOM_SYSTEM.md](./ROOM_SYSTEM.md).

### Production Notes

- Configure `CORS_ORIGIN` to your deployed domain.
- Provide your own TURN server via `VITE_TURN_*` env vars for reliable connectivity behind strict NATs.
- PeerJS uses the public PeerJS broker by default; for production scale, consider self-hosting a PeerJS server.
- Rooms are in-memory only — they do not persist across server restarts.

## License

MIT
