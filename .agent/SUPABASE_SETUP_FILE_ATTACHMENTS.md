# Supabase Setup Guide - D-Chat File Attachments

## Overview
This guide covers setting up the necessary database tables and storage buckets in Supabase to support D-Chat file attachments.

## Prerequisites
- Supabase project already created
- D-Chat tables (`d_messages`, `d_conversations`) already created
- Access to Supabase dashboard or SQL editor

## 1. Create Message Attachments Table

Run this SQL in your Supabase SQL Editor:

```sql
-- Create d_message_attachments table
CREATE TABLE IF NOT EXISTS public.d_message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.d_messages(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  storage_path TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_d_message_attachments_message_id 
ON public.d_message_attachments(message_id);

CREATE INDEX IF NOT EXISTS idx_d_message_attachments_created_at 
ON public.d_message_attachments(created_at DESC);

-- Enable RLS
ALTER TABLE public.d_message_attachments ENABLE ROW LEVEL SECURITY;

-- Create RLS policy: Users can view attachments for messages they're involved in
CREATE POLICY "Users can view message attachments" 
ON public.d_message_attachments 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.d_messages 
    WHERE d_messages.id = d_message_attachments.message_id
    AND (
      d_messages.sender_id = auth.uid() 
      OR d_messages.recipient_id = auth.uid()
    )
  )
);

-- Create RLS policy: Only message sender can insert attachments
CREATE POLICY "Users can insert attachments for their messages" 
ON public.d_message_attachments 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.d_messages 
    WHERE d_messages.id = d_message_attachments.message_id
    AND d_messages.sender_id = auth.uid()
  )
);

-- Create RLS policy: Only message sender can delete attachments
CREATE POLICY "Users can delete their message attachments" 
ON public.d_message_attachments 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.d_messages 
    WHERE d_messages.id = d_message_attachments.message_id
    AND d_messages.sender_id = auth.uid()
  )
);
```

## 2. Create Storage Bucket

In Supabase Dashboard:

1. Go to **Storage** section
2. Click **New Bucket**
3. Configure:
   - **Name**: `chat-attachments`
   - **Public bucket**: ✅ Checked (for direct file access)
   - **File size limit**: 100 MB (or your preference)

4. Click **Create Bucket**

## 3. Create Storage Policies

In Supabase Dashboard → Storage → `chat-attachments` → Policies:

### Allow Authenticated Users to Upload
```sql
(bucket_id = 'chat-attachments'::text)
AND
(auth.role() = 'authenticated'::text)
```
- **Allowed for**: INSERT

### Allow Public Read Access (Downloads)
```sql
(bucket_id = 'chat-attachments'::text)
```
- **Allowed for**: SELECT

### Allow Users to Delete Their Own Files
```sql
(bucket_id = 'chat-attachments'::text)
AND
((storage.foldername(name))[1] = auth.uid()::text OR auth.role() = 'service_role'::text)
```
- **Allowed for**: DELETE

## 4. Update RLS Policies

If your `d_messages` table doesn't have proper RLS, update it:

```sql
-- Ensure d_messages has RLS enabled
ALTER TABLE public.d_messages ENABLE ROW LEVEL SECURITY;

-- Users can view messages they sent or received
CREATE POLICY IF NOT EXISTS "Users can view their messages" 
ON public.d_messages 
FOR SELECT 
USING (
  auth.uid() = sender_id OR auth.uid() = recipient_id
);

-- Users can insert their own messages
CREATE POLICY IF NOT EXISTS "Users can insert their messages" 
ON public.d_messages 
FOR INSERT 
WITH CHECK (auth.uid() = sender_id);

-- Users can update their messages
CREATE POLICY IF NOT EXISTS "Users can update their messages" 
ON public.d_messages 
FOR UPDATE 
USING (auth.uid() = sender_id OR auth.uid() = recipient_id)
WITH CHECK (auth.uid() = sender_id OR auth.uid() = recipient_id);
```

## 5. Verify Setup

### Check Table Creation
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('d_message_attachments', 'd_messages');
```

### Check RLS Enabled
```sql
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('d_message_attachments', 'd_messages');
```

### Check Indexes
```sql
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'd_message_attachments';
```

## 6. Environment Configuration

Ensure your Supabase service is properly configured in your application:

```typescript
// src/config.ts or environment files
export const SUPABASE_CONFIG = {
  url: 'your-supabase-url',
  anonKey: 'your-anon-key',
  serviceKey: 'your-service-key',
  buckets: {
    chatAttachments: 'chat-attachments'
  }
};
```

## 7. Test File Upload

Quick test in Supabase Dashboard:

1. Go to **Storage** → `chat-attachments`
2. Click **Upload File**
3. Select a test file
4. Upload should succeed
5. Click file to get public URL

Public URL format:
```
https://your-supabase-url/storage/v1/object/public/chat-attachments/path/to/file
```

## 8. Backup Existing Data

Before making changes to production:

```bash
# Backup database
pg_dump postgres://[user]:[password]@[host]:5432/[database] > backup.sql

# Backup storage bucket
# Use Supabase CLI or dashboard export feature
```

## Troubleshooting

### Uploads Fail with "403 Forbidden"
- Check storage bucket RLS policies
- Verify `auth.uid()` matches uploading user
- Check file size limit not exceeded

### Attachments Not Appearing in Messages
- Verify `d_message_attachments` table has data
- Check `message_id` foreign key references valid messages
- Verify RLS policies allow reading

### Can't Delete Attachments
- Check DELETE RLS policy
- Verify user is the message sender
- Check storage bucket delete policy

### Storage Path Conflicts
- Path must be unique (UNIQUE constraint)
- Use format: `d-chat/{conversationId}/{messageId}/{timestamp}_{random}`
- Check for duplicate uploads

## Production Considerations

1. **Implement file scanning** - Check uploads for malware
2. **Set retention policies** - Auto-delete old files if needed
3. **Monitor storage usage** - Set alerts for quota approaching
4. **Implement CDN** - Use Supabase CDN or Cloudflare for fast delivery
5. **Implement backups** - Regular backup of stored files
6. **Add encryption** - Encrypt sensitive files in transit/at rest
7. **Implement quotas** - Limit file sizes and storage per user
8. **Add audit logging** - Track file uploads/downloads/deletes

## Related Documentation

- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [Supabase RLS Documentation](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [D-Chat Implementation Guide](FILE_ATTACHMENT_SENDING_IMPLEMENTATION.md)

