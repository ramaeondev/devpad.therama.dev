# D-Chat Implementation Guide

## Overview
D-Chat is a covert communication tool for gamers with a retro Matrix-inspired aesthetic. It's a one-to-one chat application built with Angular, Tailwind CSS, and Supabase real-time capabilities.

## Architecture

### Service Layer
- **DChatService** (`d-chat.service.ts`): Core service handling all D-Chat operations
  - Real-time message subscriptions
  - User status management
  - Conversation management
  - User search and discovery

### Components
1. **DChatComponent** (`pages/d-chat.component.ts`): Main chat container
2. **ChatMessageComponent** (`components/chat-message/`): Individual message display
3. **ConversationItemComponent** (`components/conversation-list/`): Conversation list item
4. **UserSearchComponent** (`components/user-search/`): User discovery modal

### Data Models
- `DMessage`: Individual chat message
- `DConversation`: Conversation between two users
- `DUserStatus`: Online/offline status
- `DChatUser`: User profile with status

## Database Setup

### Required Supabase Tables
Run the migration SQL from `supabase/migrations/001_create_d_chat_tables.sql`:

1. **d_conversations**: Stores one-to-one conversation metadata
2. **d_messages**: Stores individual messages
3. **d_user_status**: Tracks user online/offline status

### Row Level Security (RLS)
All tables have RLS enabled with appropriate policies:
- Users can only see their own conversations and messages
- Messages are readable by sender and recipient
- Status updates are restricted to the user

## Features

### Real-Time Messaging
- Instant message delivery via Supabase real-time subscriptions
- Message read receipts
- Online/offline status indicators

### User Interface
- **Retro Theme**: Green (#00ff00) and black color scheme with monospace fonts
- **Responsive Design**: Works on mobile, tablet, and desktop
- **Mobile Sidebar**: Collapsible conversation list on small screens
- **Status Indicators**: Visual indicators for online/offline users

### Keyboard Shortcuts
- `Ctrl+Enter`: Send message (when in message input)

## Setup Instructions

### 1. Create Supabase Tables
Execute the SQL migration in your Supabase console:
```sql
-- Copy contents of supabase/migrations/001_create_d_chat_tables.sql
```

### 2. Configure Environment
Ensure your environment files have Supabase URL and API key:
```typescript
// src/environments/environment.ts
export const environment = {
  supabase: {
    url: 'your-supabase-url',
    anonKey: 'your-anon-key',
  },
};
```

### 3. Router Configuration
D-Chat is already configured in `app.routes.ts`:
```typescript
{
  path: 'd-chat',
  canActivate: [authGuard],
  loadChildren: () => import('./features/d-chat/d-chat.routes'),
}
```

## Usage

### Starting the Application
1. Navigate to `/d-chat` (requires authentication)
2. Click "NEW CHAT" or "START NEW CHAT" button
3. Search for a user by name
4. Select a user to start the conversation
5. Type messages and press Send or Ctrl+Enter

### Viewing Conversations
- Conversations appear in the left sidebar
- Most recent messages appear first
- Unread message indicator (green dot)
- Online status shown with indicator

### Message Features
- Messages show timestamp
- Read receipts (double checkmark) for sent messages
- Automatic message scrolling
- Support for multi-line messages

## Testing

### Unit Tests
Run all tests:
```bash
npm test
```

Test files:
- `d-chat.service.spec.ts`: Service tests
- `pages/d-chat.component.spec.ts`: Main component tests
- `components/chat-message/chat-message.component.spec.ts`: Message component tests
- `components/conversation-list/conversation-list.component.spec.ts`: Conversation list tests
- `components/user-search/user-search.component.spec.ts`: User search tests

### Test Coverage
- Service methods (message sending, user lookup, status management)
- Component initialization and interaction
- Event emissions and state management
- Error handling

## Performance Considerations

### Optimization
1. **Lazy Loading**: D-Chat feature is lazy-loaded
2. **Real-Time Subscriptions**: Automatic cleanup on component destroy
3. **Message Pagination**: Messages loaded in batches of 50
4. **Indexed Queries**: Database queries use indexes for performance

### Best Practices
- Unsubscribe from real-time channels on component destroy
- Clear message input after sending
- Limit search results to 10 users
- Update user status every 30 seconds (heartbeat)

## Styling Guide

### Color Scheme
- **Primary Green**: `#00ff00` (retro-green)
- **Background Black**: `#000000` (retro-black)
- **Dark Gray**: `#1a1a1a` for contrast

### Typography
- Font: Courier New / JetBrains Mono (monospace)
- Letter spacing: 2px for headers
- Retro glow effects on interactions

### Tailwind Utilities
- Use `text-retro-green` and `bg-retro-green` for primary colors
- Border color: `border-retro-green`
- Dark mode: Enabled globally with custom theme

## Troubleshooting

### Messages Not Sending
1. Check user authentication: `auth.userId()` should return a valid UUID
2. Verify Supabase tables exist and RLS policies are correct
3. Check browser console for errors

### Real-Time Not Working
1. Ensure Supabase real-time is enabled in project settings
2. Verify RealtimeClient connection
3. Check network tab for WebSocket connections

### User Status Not Updating
1. Verify `d_user_status` table exists
2. Check that heartbeat is running (every 30 seconds)
3. Confirm RLS policies allow status updates

### Styling Issues
1. Rebuild Tailwind CSS: `npm run build`
2. Check that tailwind.config.js has retro-green color defined
3. Verify dark mode is enabled in HTML root

## Future Enhancements

### Planned Features
- [ ] Message attachments and file sharing
- [ ] Emoji reactions to messages
- [ ] Message search functionality
- [ ] Typing indicators
- [ ] Message editing and deletion
- [ ] Voice and video calling
- [ ] End-to-end encryption
- [ ] Message forwarding
- [ ] Read receipts with timestamps

### Performance Improvements
- [ ] Virtual scrolling for large message lists
- [ ] Message caching strategy
- [ ] Image lazy loading
- [ ] WebRTC for peer-to-peer calls

## API Reference

### DChatService Methods

#### `initializeChat(): Promise<void>`
Initialize the chat system and set up subscriptions.

#### `getOrCreateConversation(otherUserId: string): Promise<DConversation>`
Get or create a conversation with another user.

#### `sendMessage(conversationId: string, recipientId: string, content: string): Promise<DMessage>`
Send a message to another user.

#### `getMessagesBetweenUsers(otherUserId: string, limit: number): Promise<DMessage[]>`
Retrieve message history between two users.

#### `getUserById(userId: string): Promise<DChatUser | null>`
Get user profile information.

#### `searchUsers(query: string): Promise<DChatUser[]>`
Search for users by name.

#### `cleanup(userId: string): void`
Clean up subscriptions and set user offline.

## Security Notes

1. All database operations use Row Level Security (RLS)
2. Users can only access their own conversations and messages
3. Sensitive data (API keys) stored in environment variables
4. All inputs are validated before database operations
5. Messages are not encrypted by default (use application-level encryption for sensitive data)

## Support

For issues or questions about D-Chat implementation, refer to:
- Supabase Documentation: https://supabase.com/docs
- Angular Signals: https://angular.io/guide/signals
- Tailwind CSS: https://tailwindcss.com/docs
