// Supabase Edge Function: Delete User by Admin
import { serve } from 'https://deno.land/x/sift@0.6.0/mod.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function sendEmail(email: string, name: string) {
  // Replace with your email provider integration
  // Example: SendGrid, Resend, etc.
  // This is a stub for demonstration
  console.log(`Sending deletion confirmation email to ${email}`);
  // TODO: Implement actual email sending logic
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const { user_id } = await req.json();
  if (!user_id) {
    return new Response('Missing user_id', { status: 400 });
  }

  // Fetch user profile
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('user_id, first_name, last_name, disabled')
    .eq('user_id', user_id)
    .single();

  if (profileError || !profile) {
    return new Response('User not found', { status: 404 });
  }

  // Fetch user email from auth.users
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('email')
    .eq('id', user_id)
    .single();

  if (userError || !user) {
    return new Response('User email not found', { status: 404 });
  }

  // Mark user as disabled
  const { error: updateError } = await supabase
    .from('user_profiles')
    .update({ disabled: true })
    .eq('user_id', user_id);

  if (updateError) {
    return new Response('Failed to disable user', { status: 500 });
  }

  // Send confirmation email
  await sendEmail(user.email, profile.first_name || 'User');

  // Optionally: delete user from auth.users after 24h (not implemented here)

  return new Response('User disabled and email sent', { status: 200 });
});
