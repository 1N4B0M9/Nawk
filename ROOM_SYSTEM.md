# Room System Implementation

This document describes the room system implementation for the NoAwkwardness real-time video/audio web app.

## Features

### ✅ Room Creation
- Users can create unique rooms from the homepage
- Room IDs are generated using a timestamp + random string format (e.g., `lq1a2b3c-def4`)
- Room IDs are 3-50 characters long and contain only letters, numbers, and hyphens

### ✅ Room Joining
- Users can join existing rooms by entering a room code
- Toggle between "Create Room" and "Join Room" modes
- Direct room joining via URL: `/room/:roomId`
- Host vs participant distinction

### ✅ Shareable URLs
- Each room gets a unique URL: `/room/:roomId`
- Users can share the room link with others
- One-click copy to clipboard functionality

### ✅ Participant Limits
- Maximum 15 participants per room
- Server-side validation prevents exceeding the limit
- Automatic room cleanup when empty

### ✅ Error Handling
- Invalid room ID format validation
- Room full error messages
- Connection timeout handling
- Graceful error display to users

## Architecture

### Server (room-server.cjs)
- **Room Management**: In-memory Map of `{ roomId: Map<userId, participant> }`
- **Validation**: Room ID format and participant count validation
- **Atomic Operations**: Prevents race conditions during simultaneous joins
- **Auto-cleanup**: Removes empty rooms automatically

### Frontend Components

#### HomePage (`src/components/HomePage.tsx`)
- **Create Mode**: Room creation interface with name input and room generation
- **Join Mode**: Room joining interface with name and room code inputs
- **Mode Toggle**: Switch between create and join modes
- Shareable room link with copy functionality
- Feature showcase

#### Room (`src/components/Room.tsx`)
- Room joining interface
- Error handling and display
- Participant count display
- Host vs participant distinction
- Integration with existing BubbleCanvas

#### Updated Services
- **socketService**: Added join success/error event handlers
- **useVoiceflow**: Enhanced with room-specific logic and error handling

## Usage Flow

### 1. Create Room Flow
1. Visit homepage (`/`)
2. Ensure "Create Room" mode is selected
3. Enter your name
4. Click "Create New Room"
5. Copy the generated room link to share with others
6. Click "Join Room" to enter the room

### 2. Join Room Flow
1. Visit homepage (`/`)
2. Switch to "Join Room" mode
3. Enter your name
4. Enter the room code (shared by the host)
5. Click "Join Room"
6. Automatic connection to signaling server and room join

### 3. Direct URL Join Flow
1. Visit room URL directly (`/room/:roomId`)
2. Enter your name
3. Click "Join Room"
4. Automatic connection and room join

### 4. Room Experience
- Drag bubbles to connect with nearby participants
- Real-time video/audio streaming
- Participant count display
- Host indicator (if you created the room)
- Back button to return to homepage

## Security & Validation

### Server-side Validation
- Room ID format validation (regex: `/^[a-zA-Z0-9-]{3,50}$/`)
- Participant count limits (max 15 per room)
- Atomic join operations to prevent race conditions

### Client-side Validation
- Room ID format checking before connection attempts
- Form validation for both create and join modes
- Error message display for various failure scenarios
- Graceful handling of connection timeouts

## Error Scenarios Handled

1. **Invalid Room ID**: Shows error message and prevents connection
2. **Room Full**: Displays "Room is full" message with participant limit
3. **Connection Timeout**: Handles network issues gracefully
4. **Invalid URL**: Redirects to homepage with error message
5. **Empty Room Code**: Prevents joining with empty room code
6. **Empty Name**: Prevents joining without entering a name

## Technical Implementation

### Room ID Generation
```typescript
const generateRoomId = () => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6);
  return `${timestamp}-${random}`;
};
```

### Mode Toggle System
```typescript
type Mode = 'create' | 'join';

const [mode, setMode] = useState<Mode>('create');

const handleModeChange = (newMode: Mode) => {
  setMode(newMode);
  setCreatedRoomId(null);
  setRoomCode('');
  setCopied(false);
};
```

### Server Room Management
```javascript
const rooms = new Map();
const MAX_PARTICIPANTS_PER_ROOM = 15;

// Atomic join operation
if (existingRoom && existingRoom.size >= MAX_PARTICIPANTS_PER_ROOM) {
  socket.emit('join-error', { 
    error: `Room is full. Maximum ${MAX_PARTICIPANTS_PER_ROOM} participants allowed.` 
  });
  return;
}
```

### React Router Integration
```typescript
<Routes>
  <Route path="/" element={<HomePage />} />
  <Route path="/room/:roomId" element={<Room />} />
</Routes>
```

## User Interface

### HomePage Modes

#### Create Room Mode
- Name input field
- "Create New Room" button
- Room ID display with copy functionality
- "Join Room" button (after creation)

#### Join Room Mode
- Name input field
- Room code input field
- "Join Room" button
- Form validation for both fields

### Room Interface
- Room ID display
- Host indicator (if applicable)
- Participant count
- Error message display
- Join form or video canvas

## Testing

To test the room system:

1. Start the development server: `npm run dev`
2. Start the signaling server: `npm run start-server`
3. Open multiple browser tabs/windows
4. **Test Create Flow**:
   - Create a room in one tab
   - Copy the room link
   - Open in another tab via URL
5. **Test Join Flow**:
   - Create a room and note the room code
   - In another tab, use "Join Room" mode
   - Enter the room code and join
6. Test participant limits by opening 15+ tabs
7. Test error scenarios with invalid room IDs
8. Test form validation (empty fields)

## Future Enhancements

- Persistent room storage (database)
- Room passwords/authentication
- Room settings (max participants, privacy)
- Room history and analytics
- Admin controls for room management
- Room discovery/search functionality
- Room templates or presets 