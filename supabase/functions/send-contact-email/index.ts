import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { Resend } from 'npm:resend@2.0.0';
import { Buffer } from 'node:buffer';
const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders,
    });
  }
  try {
    const { subject, message, userEmail, userName, attachments } = await req.json();
    if (!subject || !message) {
      return new Response(
        JSON.stringify({
          error: 'Subject and message are required',
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
          status: 400,
        },
      );
    }
    // Basic validation
    if (subject.length > 200) {
      return new Response(
        JSON.stringify({
          error: 'Subject must be less than 200 characters',
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
          status: 400,
        },
      );
    }
    if (message.length > 5000) {
      return new Response(
        JSON.stringify({
          error: 'Message must be less than 5000 characters',
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
          status: 400,
        },
      );
    }
    // Process attachments if any
    let emailAttachments = [];
    if (attachments && Array.isArray(attachments)) {
      if (attachments.length > 5) {
        return new Response(
          JSON.stringify({
            error: 'Maximum 5 attachments allowed',
          }),
          {
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
            status: 400,
          },
        );
      }
      // Convert base64 content to Buffer for Resend
      // Deno handles Buffer from 'node:buffer' or via npm packages,
      // but Resend's npm package should handle base64 strings or Buffers.
      // Let's try passing the base64 string directly first if Resend supports it,
      // or convert to Buffer using Buffer.from (available in Deno via npm compat).
      emailAttachments = attachments.map((att) => ({
        filename: att.filename,
        content: Buffer.from(att.content, 'base64'),
      }));
    }
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>New Contact Message</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            
            <!-- Header -->
            <div style="background-color: #f9fafb; padding: 20px; border-bottom: 1px solid #e5e7eb;">
              <h2 style="margin: 0; color: #111827; font-size: 20px;">New Contact Message</h2>
              <p style="margin: 5px 0 0; color: #6b7280; font-size: 14px;">Received via DevPad Contact Form</p>
            </div>

            <!-- Content -->
            <div style="padding: 24px;">
              <div style="margin-bottom: 20px;">
                <p style="margin: 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; font-weight: 600;">From</p>
                <p style="margin: 4px 0 0; font-size: 16px; color: #111827;">
                  <strong>${userName}</strong> &lt;<a href="mailto:${userEmail}" style="color: #2563eb; text-decoration: none;">${userEmail}</a>&gt;
                </p>
              </div>

              <div style="margin-bottom: 20px;">
                <p style="margin: 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; font-weight: 600;">Subject</p>
                <p style="margin: 4px 0 0; font-size: 16px; color: #111827;">${subject}</p>
              </div>

              <div style="margin-top: 24px;">
                <p style="margin: 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; font-weight: 600;">Message</p>
                <div style="margin-top: 8px; background-color: #f3f4f6; padding: 16px; border-radius: 8px; color: #374151; white-space: pre-wrap;">${message}</div>
              </div>
            </div>

            <!-- Footer -->
            <div style="background-color: #f9fafb; padding: 16px 24px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; text-align: center;">
              <p style="margin: 0;">
                Sent on ${new Date().toLocaleString('en-US', {
                  dateStyle: 'full',
                  timeStyle: 'short',
                })}
              </p>
              <p style="margin: 4px 0 0;">
                &copy; ${new Date().getFullYear()} DevPad. All rights reserved.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;
    const data = await resend.emails.send({
      from: `${userName} via DevPad <user@devpad.therama.dev>`,
      to: Deno.env.get('DEVELOPER_EMAIL') || 'notes@therama.dev',
      reply_to: userEmail,
      subject: `[Contact] ${subject}`,
      html: emailHtml,
      attachments: emailAttachments,
    });
    return new Response(JSON.stringify(data), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      status: 200,
    });
  } catch (error) {
    console.error('Error sending email:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to send email',
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 500,
      },
    );
  }
});
