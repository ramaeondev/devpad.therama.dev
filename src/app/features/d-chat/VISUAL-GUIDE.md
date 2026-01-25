# D-Chat Visual Guide

## Overview

This document provides a visual description of the D-Chat retro-style interface since we cannot run the application in this environment.

## Main Interface Components

### 1. Retro-Styled Sidebar Button

The sidebar now includes a prominent D-Chat button with the following retro styling:

```
┌─────────────────────────────────────┐
│ ▸ 💬  D-CHAT           ▸           │ <- Retro button with gradient background
│       Retro Chat                    │    and green border glow
└─────────────────────────────────────┘
```

**Visual Details:**

- **Background**: Dark blue-black gradient (`#0a0e27` to `#151933`)
- **Border**: Bright green border (`#00ff41`) with glow effect
- **Text**: Terminal green for title, dim green for subtitle
- **Font**: Monospace (Courier New) with letter-spacing
- **Icon**: Chat bubble icon in a bordered box with green background
- **Arrow**: Amber-colored chevron that slides right on hover
- **Hover Effect**: Animated shimmer/scan effect across the button
- **Active State**: Border turns amber with amber glow

### 2. D-Chat Main Interface

When you click the D-Chat button, you see a full-screen retro terminal interface:

```
╔════════════════════════════════════════════════════════════════════════╗
║  ▸ D-CHAT v1.0                                                         ║
║  ONE-TO-ONE SECURE CHAT SYSTEM                                         ║
╠════════════════════════════════════════════════════════════════════════╣
║                                                                         ║
║  ┌─────────────────┬──────────────────────────────────────────────┐   ║
║  │ ONLINE USERS  ↻ │                                              │   ║
║  ├─────────────────┤                                              │   ║
║  │                 │         SELECT A USER TO START CHATTING      │   ║
║  │ ┌─────────────┐ │                                              │   ║
║  │ │ JD          │ │   ___       ____ _   _    _  _____           │   ║
║  │ │ John Doe    │ │  |   \     / ___| | | |  / \|_   _|          │   ║
║  │ │ john@em...  │ │  | |) |___| |   | |_| | / _ \ | |            │   ║
║  │ └─────────────┘ │  |___/    | |___|  _  |/ ___ \| |            │   ║
║  │                 │  |_|       \____|_| |_/_/   \_\_|            │   ║
║  │ ┌─────────────┐ │                                              │   ║
║  │ │ AS          │ │  • CHOOSE A USER FROM THE LEFT PANEL         │   ║
║  │ │ Alice Smith │ │  • TYPE YOUR MESSAGE IN THE INPUT BOX        │   ║
║  │ │ alice@em... │ │  • PRESS ENTER TO SEND                       │   ║
║  │ └─────────────┘ │                                              │   ║
║  │                 │                                              │   ║
║  └─────────────────┴──────────────────────────────────────────────┘   ║
║                                                                         ║
╠════════════════════════════════════════════════════════════════════════╣
║  D-CHAT v1.0  |  SYSTEM READY  |  ● CONNECTED                         ║
╚════════════════════════════════════════════════════════════════════════╝
```

### 3. Active Chat View

When a user is selected, the interface transforms:

```
╔════════════════════════════════════════════════════════════════════════╗
║  ▸ D-CHAT v1.0                                                         ║
║  ONE-TO-ONE SECURE CHAT SYSTEM                                         ║
╠════════════════════════════════════════════════════════════════════════╣
║                                                                         ║
║  ┌─────────────────┬──────────────────────────────────────────────┐   ║
║  │ ONLINE USERS  ↻ │  ┌────────────────────────────────────────┐  │   ║
║  ├─────────────────┤  │ JD  John Doe                           │  │   ║
║  │                 │  │     ● ONLINE                           │  │   ║
║  │ ┌─────────────┐ │  └────────────────────────────────────────┘  │   ║
║  │ │ JD        ▸ │ │  ┌────────────────────────────────────────┐  │   ║
║  │ │ John Doe    │ │  │                                        │  │   ║
║  │ │ john@em...  │ │  │  ┌──────────────────────┐             │  │   ║
║  │ └─────────────┘ │  │  │ YOU            10:30 │             │  │   ║
║  │      (active)   │  │  │ Hey John!            │             │  │   ║
║  │                 │  │  └──────────────────────┘             │  │   ║
║  │ ┌─────────────┐ │  │                                        │  │   ║
║  │ │ AS          │ │  │              ┌──────────────────────┐  │  │   ║
║  │ │ Alice Smith │ │  │              │ JOHN DOE      10:31  │  │  │   ║
║  │ │ alice@em... │ │  │              │ Hi! How are you?     │  │  │   ║
║  │ └─────────────┘ │  │              └──────────────────────┘  │  │   ║
║  │                 │  │                                        │  │   ║
║  └─────────────────┤  └────────────────────────────────────────┘  │   ║
║                    │  ┌────────────────────────────────────────┐  │   ║
║                    │  │ ▸ [TYPE YOUR MESSAGE...]      [SEND ▸] │  │   ║
║                    │  └────────────────────────────────────────┘  │   ║
║                    └──────────────────────────────────────────────┘   ║
║                                                                         ║
╠════════════════════════════════════════════════════════════════════════╣
║  D-CHAT v1.0  |  SYSTEM READY  |  ● CONNECTED                         ║
╚════════════════════════════════════════════════════════════════════════╝
```

## Color Scheme

The interface uses a retro terminal color palette:

### Primary Colors

- **Background**: `#0a0e27` (Deep navy/black)
- **Secondary Background**: `#151933` (Lighter navy)
- **Tertiary Background**: `#1f2540` (Even lighter navy)

### Text Colors

- **Primary Text (Terminal Green)**: `#00ff41` - Used for main text, borders, titles
- **Accent (Amber)**: `#ffb000` - Used for highlights, selected items, prompts
- **Accent (Cyan)**: `#00ffff` - Used for instructions, secondary info
- **Dim Text**: `#4a9c5a` - Used for timestamps, subtle text

### Effects

- **Glow Effects**: `rgba(0, 255, 65, 0.5)` - Green glow on borders and text
- **Box Shadows**: Applied to buttons, messages, and panels for depth

## Typography

- **Font Family**: 'Courier New', monospace (consistent terminal aesthetic)
- **Letter Spacing**: 0.1rem - 0.2rem (retro computer feel)
- **Text Shadow**: `0 0 10px rgba(0, 255, 65, 0.5)` on important text

## Animations

### 1. Blinking Cursor

The cursor (▸) in the title blinks on/off with a 1-second interval

### 2. Pulsing Status Dot

The green dot next to "ONLINE" pulses between full and 50% opacity

### 3. Button Hover

- Shimmer effect sweeps across button from left to right
- Border color changes from green to amber
- Arrow icon slides right by 4px

### 4. Spinner

Loading states show a rotating circular spinner in terminal green

## Accessibility Features

### ARIA Labels

All interactive elements have descriptive labels:

- Buttons: "Open D-Chat retro chat application", "Send message", "Refresh user list"
- Inputs: "Message input", "Type your message"
- Regions: "Chat messages", "User list", "Chat conversation"

### Keyboard Navigation

- Tab through all interactive elements
- Enter to select users and send messages
- Focus indicators clearly visible with amber outline

### Screen Reader Support

- Live regions announce new messages
- Proper semantic HTML (main, aside, article, etc.)
- Descriptive text for all icons and visual elements
- Status messages announced via aria-live

## Responsive Design

### Desktop (>= 1024px)

- Sidebar width: 300px
- Two-column layout (users | messages)
- Full retro effects visible

### Tablet (768px - 1023px)

- Sidebar width: 100% (max 300px)
- Stacked layout
- Message width: 85% of container

### Mobile (< 768px)

- Full-width sidebar at top
- Messages stack vertically
- Simplified animations for performance

## Message Styles

### Sent Messages (You)

- Aligned right
- Amber border (`#ffb000`)
- Darker background
- "YOU" label in amber

### Received Messages (Other User)

- Aligned left
- Cyan border (`#00ffff`)
- Lighter background
- Username label in cyan

## Special UI Elements

### ASCII Art Welcome

The welcome screen features ASCII art spelling "D-CHAT" in a retro computer font style.

### Footer Status Bar

Displays system status:

- Version number
- "SYSTEM READY" indicator
- Pulsing connection dot
- All in retro green/amber

### Input Box

- Green border with amber glow on focus
- Retro prompt symbol (▸) on the left
- Placeholder in dim green
- Send button with hover glow effect

## Database Requirements

To use this feature, the Supabase database needs:

1. `chat_messages` table (see `docs/database/d-chat-migration.sql`)
2. `profiles` table with columns: `id`, `email`, `first_name`, `last_name`, `avatar_url`
3. Real-time enabled on `chat_messages` table
4. Row-level security policies configured

## Implementation Notes

- All styles are in `d-chat.component.scss` using SCSS variables
- Component uses Angular Signals for reactive state
- Real-time updates via Supabase subscriptions
- OnPush change detection for performance
- FormsModule for two-way binding on message input

## Testing Checklist

To manually test the feature:

1. ✓ Navigate to `/d-chat` after login
2. ✓ Verify retro styling appears correctly
3. ✓ Check user list loads
4. ✓ Select a user
5. ✓ Send a message
6. ✓ Verify real-time delivery
7. ✓ Test keyboard navigation (Tab, Enter)
8. ✓ Test screen reader compatibility
9. ✓ Test on mobile device
10. ✓ Verify hover effects and animations

## Future Enhancement Ideas

- Add typing indicators (e.g., "John is typing...")
- Emoji picker with retro-styled emojis
- Sound effects (retro beeps for messages)
- CRT scanline overlay effect
- Matrix-style text rain animation
- Custom retro avatars/profile pics
- Message reactions (👍, ❤️, etc.)
- File/image sharing capability
