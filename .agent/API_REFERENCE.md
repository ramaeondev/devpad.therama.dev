# File Attachment API Reference

## D-Chat Service Methods

### File Upload

#### `uploadFile(file: File, conversationId: string, messageId: string)`
Uploads a file to Supabase Storage under the chat-attachments bucket.

**Parameters:**
- `file` - File object to upload
- `conversationId` - ID of the conversation (used for path organization)
- `messageId` - ID of the message (used for path organization)

**Returns:** `Promise<{ path: string; url: string }>`
- `path` - Storage path for future reference (e.g., `d-chat/{conversationId}/{messageId}/file.pdf`)
- `url` - Public URL for downloading the file

**Throws:** Error if upload fails

**Example:**
```typescript
const { path, url } = await dChatService.uploadFile(
  selectedFile, 
  'conv-123', 
  'msg-456'
);
```

---

### Attachment Records

#### `createAttachmentRecord(messageId: string, file: File, storagePath: string)`
Creates a database record linking a file to a message.

**Parameters:**
- `messageId` - ID of the message
- `file` - File object (for metadata)
- `storagePath` - Storage path from uploadFile()

**Returns:** `Promise<DMessageAttachment>`
- Returns the created attachment record with all metadata

**Example:**
```typescript
const attachment = await dChatService.createAttachmentRecord(
  messageId,
  file,
  path
);
```

---

#### `getMessageAttachments(messageId: string)`
Retrieves all attachments for a message.

**Parameters:**
- `messageId` - ID of the message

**Returns:** `Promise<DMessageAttachment[]>`
- Array of attachment records

**Example:**
```typescript
const attachments = await dChatService.getMessageAttachments('msg-456');
attachments.forEach(att => {
  console.log(att.file_name, att.file_size);
});
```

---

### Message with Attachments

#### `sendMessageWithAttachments(conversationId: string, recipientId: string, content: string, attachments: FileMetadata[] = [])`
Sends a message with optional file attachments. This is the main method for sending messages with files.

**Parameters:**
- `conversationId` - ID of the conversation
- `recipientId` - ID of the recipient user
- `content` - Message text (can be empty for files-only messages)
- `attachments` - Array of FileMetadata objects (optional)

**Returns:** `Promise<DMessage>`
- Returns the created message with attachments array

**Process:**
1. Creates message record in database
2. For each file:
   - Uploads to storage
   - Creates attachment record
   - Adds to message.attachments
3. Updates conversation last_message_at
4. Returns complete message with attachments

**Example:**
```typescript
const message = await dChatService.sendMessageWithAttachments(
  'conv-123',
  'user-456',
  'Here are the documents',
  selectedFiles
);

// Message now has:
// - message.id
// - message.content
// - message.attachments[{ id, file_name, file_size, storage_path }]
```

---

#### `sendMessage(conversationId: string, recipientId: string, content: string)`
Sends a text-only message (legacy method).

**Parameters:**
- `conversationId` - ID of the conversation
- `recipientId` - ID of the recipient user
- `content` - Message text

**Returns:** `Promise<DMessage>`

---

### File Access

#### `getAttachmentUrl(storagePath: string)`
Gets the public URL for an attachment.

**Parameters:**
- `storagePath` - Storage path from attachment record

**Returns:** `string`
- Public URL for downloading the file

**Example:**
```typescript
const url = dChatService.getAttachmentUrl(attachment.storage_path);
window.open(url, '_blank'); // Download file
```

---

### File Deletion

#### `deleteAttachment(attachmentId: string, storagePath: string)`
Deletes an attachment and its file from storage.

**Parameters:**
- `attachmentId` - ID of the attachment record
- `storagePath` - Storage path of the file

**Returns:** `Promise<void>`

**Permissions:** Only the message sender can delete attachments

**Example:**
```typescript
await dChatService.deleteAttachment(
  'att-123',
  'd-chat/conv-123/msg-456/file.pdf'
);
```

---

## Component Methods

### D-Chat Component

#### `sendMessage(attachmentData?: FileMetadata[])`
Sends a message with optional attachments.

**Parameters:**
- `attachmentData` - Optional array of FileMetadata (passed from rich-textarea)

**Behavior:**
- Clears message input after sending
- Clears attachments array
- Shows loading state
- Handles errors with toast notifications

**Example:**
```typescript
// Called when user clicks Send or presses Ctrl+Enter
await component.sendMessage(files);
```

---

#### `onFileAttachmentsSelected(files: FileMetadata[])`
Called when files are selected in the attachment input component.

**Parameters:**
- `files` - Array of selected FileMetadata objects

**Behavior:**
- Stores files in attachments signal
- Updates file count badge
- Ready for sending

---

### Rich-Textarea Component

#### `sendMsg()`
Emits the sendMessage event with selected files.

**Output:** `sendMessage: EventEmitter<FileMetadata[]>`
- Emits array of selected files

**Note:** Updated from emitting `void` to emitting `FileMetadata[]`

---

## Data Models

### DMessageAttachment
```typescript
interface DMessageAttachment {
  id: string;                    // UUID
  message_id: string;            // Reference to d_messages
  file_name: string;             // Original filename
  file_size: number;             // Size in bytes
  file_type: string;             // MIME type
  storage_path: string;          // Path in storage bucket
  created_at: string;            // ISO timestamp
}
```

---

### DMessage (Updated)
```typescript
interface DMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  read: boolean;
  attachments?: DMessageAttachment[];  // NEW: Optional attachments
}
```

---

### FileMetadata
```typescript
interface FileMetadata {
  name: string;                  // Filename
  size: number;                  // Size in bytes
  type: string;                  // MIME type
  lastModified: number;          // Timestamp
  blob?: Blob;                   // File content
}
```

---

## Error Handling

### Upload Errors
```typescript
try {
  await dChatService.sendMessageWithAttachments(...);
} catch (error) {
  console.error('Upload failed:', error);
  // Service continues with remaining files
  // Show toast: "Failed to send message"
}
```

### File-Specific Errors
- Individual file upload errors don't block other files
- Service logs per-file errors
- Returns message with successfully uploaded files

### Input Recovery
```typescript
if (error) {
  this.messageInput.set(originalContent);  // Restore text
  this.attachments.set(originalFiles);     // Restore files
  this.toast.error('Failed to send message');
}
```

---

## Best Practices

### 1. Always Clear After Send
```typescript
this.messageInput.set('');
this.attachments.set([]);
```

### 2. Handle Large Files
```typescript
if (file.size > 10 * 1024 * 1024) {
  throw new Error('File too large (max 10MB)');
}
```

### 3. Validate Before Sending
```typescript
if (!content && attachments.length === 0) {
  return; // Nothing to send
}
```

### 4. Show Progress
```typescript
this.sendingMessage.set(true);
try {
  await service.sendMessageWithAttachments(...);
} finally {
  this.sendingMessage.set(false);
}
```

### 5. Handle Network Errors
```typescript
try {
  await upload();
} catch (error) {
  if (error.message.includes('Network')) {
    this.toast.error('Network error - please try again');
  } else {
    this.toast.error('Upload failed');
  }
}
```

---

## Storage Structure

```
chat-attachments/
├── d-chat/
│   ├── conv-123/
│   │   ├── msg-456/
│   │   │   ├── 1706304000000_abc123.pdf
│   │   │   └── 1706304001000_def456.docx
│   │   └── msg-789/
│   │       └── 1706304002000_ghi789.png
│   └── conv-999/
│       └── msg-111/
│           └── 1706304003000_jkl012.xlsx
```

**Path Format:** `d-chat/{conversationId}/{messageId}/{timestamp}_{randomString}.{ext}`

---

## Testing

### Mock Service
```typescript
const dChatServiceMock = {
  sendMessageWithAttachments: jest.fn().mockResolvedValue({ 
    id: 'msg-1', 
    attachments: [] 
  }),
  uploadFile: jest.fn().mockResolvedValue({ 
    path: 'd-chat/...', 
    url: 'https://...' 
  }),
  // ... other methods
};
```

### Test File Sending
```typescript
it('should send message with files', async () => {
  const files = [{ name: 'test.pdf', size: 1024, type: 'application/pdf' }];
  
  await component.sendMessage(files);
  
  expect(service.sendMessageWithAttachments).toHaveBeenCalledWith(
    'conv-1',
    'user-2',
    'Hello',
    files
  );
});
```

---

## Troubleshooting

### Files Not Uploading
1. Check `sendingMessage` signal - should return to false
2. Check browser console for errors
3. Verify Supabase bucket exists and is public
4. Check RLS policies on d_message_attachments table

### Attachment Records Not Created
1. Verify `d_message_attachments` table exists
2. Check foreign key constraint on message_id
3. Verify RLS policy allows inserts

### Can't Download Files
1. Verify storage bucket is public
2. Check file exists in storage
3. Verify storage path in database matches actual path

### Large Files Timeout
1. Implement chunked uploads
2. Set longer timeout in HTTP interceptor
3. Consider CDN for delivery

---

## Changelog

### Version 1.0 (Current)
- ✅ File upload to Supabase Storage
- ✅ Attachment database records
- ✅ Message with attachments support
- ✅ Multiple file batch upload
- ✅ Real-time sync
- ✅ Error handling and recovery

### Planned Features
- 📋 File preview (images, PDFs)
- 📋 Progress tracking
- 📋 Virus scanning
- 📋 Storage quotas
- 📋 Archive old files

