-- Add reply functionality to D-Chat messages

-- Add reply_to_id column to d_messages table
ALTER TABLE public.d_messages
ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES public.d_messages(id) ON DELETE SET NULL;

-- Create index for reply_to_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_d_messages_reply_to_id ON public.d_messages(reply_to_id);

-- Create index for message lookup by conversation and reply status
CREATE INDEX IF NOT EXISTS idx_d_messages_conversation_reply ON public.d_messages(conversation_id, reply_to_id);

-- Add comment for documentation
COMMENT ON COLUMN public.d_messages.reply_to_id IS 'ID of the message being replied to (null if this is not a reply)';
