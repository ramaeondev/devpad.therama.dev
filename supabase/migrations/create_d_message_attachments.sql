-- Create d_message_attachments table for D-Chat file attachments
CREATE TABLE IF NOT EXISTS public.d_message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign key constraint to d_messages
  CONSTRAINT fk_message FOREIGN KEY (message_id) 
    REFERENCES public.d_messages(id) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_d_message_attachments_message_id 
  ON public.d_message_attachments(message_id);

CREATE INDEX IF NOT EXISTS idx_d_message_attachments_created_at 
  ON public.d_message_attachments(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE public.d_message_attachments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can view attachments of messages they sent or received
CREATE POLICY "Users can view their message attachments"
  ON public.d_message_attachments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.d_messages
      WHERE id = message_id
      AND (sender_id = auth.uid() OR recipient_id = auth.uid())
    )
  );

-- Users can insert attachments only for their own messages
CREATE POLICY "Users can insert attachments for their messages"
  ON public.d_message_attachments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.d_messages
      WHERE id = message_id
      AND sender_id = auth.uid()
    )
  );

-- Users can delete only their own attachments
CREATE POLICY "Users can delete their own attachments"
  ON public.d_message_attachments
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.d_messages
      WHERE id = message_id
      AND sender_id = auth.uid()
    )
  );

-- Grant permissions to authenticated users
GRANT SELECT ON public.d_message_attachments TO authenticated;
GRANT INSERT ON public.d_message_attachments TO authenticated;
GRANT DELETE ON public.d_message_attachments TO authenticated;
