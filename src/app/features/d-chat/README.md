# D-Chat - Retro-Style One-to-One Chat

## Overview

D-Chat is a retro-styled, one-to-one chat application built with Angular and Supabase. It features a terminal-like interface with green/amber text, accessibility support via Angular ARIA, and real-time messaging.

## Features

- 🎨 **Retro Terminal Styling**: Green/amber terminal aesthetic with blinking cursors and scanline effects
- ♿ **Full ARIA Support**: Screen reader compatible with proper ARIA labels and keyboard navigation
- 🔒 **Secure**: Row-level security in Supabase ensures users can only see their own messages
- ⚡ **Real-time**: Live message updates using Supabase real-time subscriptions
- 📱 **Responsive**: Works on mobile, tablet, and desktop
- 🎯 **One-to-One**: Direct messaging between users

## Setup

### 1. Database Setup

Run the SQL migration to create the `chat_messages` table in your Supabase database:

```sql
-- See docs/database/d-chat-migration.sql
```

This creates:

- `chat_messages` table with proper indexes
- Row-level security policies
- Real-time subscription capabilities

### 2. Navigate to D-Chat

Once authenticated, click the retro-styled "D-CHAT" button in the sidebar to access the chat interface.

## Architecture

### Components

- **DChatComponent** (`src/app/features/d-chat/pages/d-chat.component.ts`)
  - Main chat interface
  - Handles user selection and message display
  - Manages real-time updates

### Services

- **DChatService** (`src/app/features/d-chat/services/d-chat.service.ts`)
  - Manages Supabase queries
  - Handles real-time subscriptions
  - Provides Observable streams for messages and users

### Routing

- Route: `/d-chat`
- Protected by `authGuard`
- Lazy-loaded for performance

## Accessibility (ARIA)

The D-Chat interface is fully accessible:

1. **Keyboard Navigation**
   - Tab through user list
   - Enter to select user
   - Focus management on message input
   - Enter to send messages

2. **Screen Reader Support**
   - Proper ARIA labels on all interactive elements
   - ARIA roles: `main`, `complementary`, `list`, `log`, etc.
   - ARIA live regions for real-time updates
   - Descriptive labels for all buttons and inputs

3. **Visual Accessibility**
   - High contrast retro colors (green on dark background)
   - Focus indicators on all interactive elements
   - Screen reader only text for context

## Retro Styling

The interface uses a retro terminal aesthetic:

- **Colors**:
  - Background: Deep blue/black (`#0a0e27`)
  - Primary text: Terminal green (`#00ff41`)
  - Accents: Amber (`#ffb000`), Cyan (`#00ffff`)
  - Glow effects for enhanced retro feel

- **Typography**:
  - Monospace font (Courier New)
  - Letter-spacing for old-school computer feel
  - ASCII art in welcome screen

- **Effects**:
  - Blinking cursor animation
  - Pulsing status indicator
  - Box shadow glows
  - Scanline-style borders

## Usage

1. **Select a User**: Click on a user from the left sidebar
2. **View Messages**: Messages appear in the center panel
3. **Send Messages**: Type in the input box and press Enter or click "SEND ▸"
4. **Real-time Updates**: New messages appear automatically

## Database Schema

```sql
chat_messages
├── id (UUID, primary key)
├── sender_id (UUID, foreign key to auth.users)
├── receiver_id (UUID, foreign key to auth.users)
├── message (TEXT)
├── read (BOOLEAN)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)
```

## Security

- Row-level security ensures users can only:
  - View messages they sent or received
  - Send messages as themselves
  - Mark received messages as read
  - Delete their own sent messages

## Future Enhancements

Potential improvements:

- [ ] Typing indicators
- [ ] Message reactions
- [ ] File/image sharing
- [ ] Message editing/deletion
- [ ] User blocking
- [ ] Message search
- [ ] Emoji picker
- [ ] Group chat support

## Testing

To test the D-Chat feature:

1. Ensure you have at least 2 user accounts
2. Login as User A
3. Navigate to `/d-chat`
4. Select User B from the list
5. Send a message
6. Login as User B in another browser/incognito
7. Navigate to `/d-chat`
8. Verify the message appears in real-time

## Dependencies

- Angular 21+
- @angular/forms (FormsModule)
- Supabase JS client
- Font Awesome icons (for UI elements)

## Troubleshooting

### Messages not appearing in real-time

- Check Supabase real-time is enabled for the `chat_messages` table
- Verify the subscription is working in browser console
- Check network tab for WebSocket connections

### Users not loading

- Ensure the `profiles` table exists with required columns
- Verify RLS policies allow reading profiles
- Check authentication state

### Styling issues

- Ensure component styles are not being overridden
- Check browser console for CSS errors
- Verify Font Awesome is loaded

## License

MIT
