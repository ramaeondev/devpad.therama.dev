const { SMTPServer } = require("smtp-server");
const { simpleParser } = require("mailparser");
const axios = require("axios");
require("dotenv").config();

const RESEND_API_KEY = process.env.RESEND_API_KEY;

if (!RESEND_API_KEY) {
    console.error("❌ RESEND_API_KEY is missing");
    process.exit(1);
}

const fs = require('fs');
const path = require('path');

// Load template
let signupTemplate = '';
try {
    signupTemplate = fs.readFileSync(path.join(__dirname, 'signup.html'), 'utf8');
    console.log("✅ Signup template loaded");
} catch (err) {
    console.warn("⚠️ Could not load signup.html:", err.message);
}

const server = new SMTPServer({
    authOptional: true, // Internal network, trust the sender or add IP checks if needed
    disabledCommands: ['STARTTLS'], // Disable TLS for internal usage to avoid cert errors
    secure: false,
    onData(stream, session, callback) {
        simpleParser(stream, async (err, parsed) => {
            if (err) {
                console.error("Error parsing email:", err);
                return callback(new Error("Error parsing email"));
            }

            console.log(`📧 Received email from: ${parsed.from.text}`);
            console.log(`   To: ${parsed.to.text}`);
            console.log(`   Subject: ${parsed.subject}`);

            let htmlContent = parsed.html || parsed.text;
            const subject = parsed.subject || '';

            // --- Template Injection Logic for Signup ---
            if (signupTemplate && (subject.includes("Confirm Your Email") || subject.includes("Confirm your email"))) {
                console.log("🎨 Detected Signup Confirmation. Injecting custom template...");

                // Extract Confirmation URL
                // Look for href=".../verify?..."
                const urlRegex = /href="([^"]*\/verify\?[^"]*)"/i;
                const match = htmlContent.match(urlRegex);

                if (match && match[1]) {
                    const confirmationUrl = match[1].replace(/&amp;/g, '&'); // Decode HTML entities in URL
                    const email = parsed.to.text; // Simple extraction
                    const originalContent = parsed.html || parsed.text || '';

                    console.log(`🔗 Extracted URL: ${confirmationUrl.substring(0, 50)}...`);

                    // Try to extract a friendly name from the original email content.
                    // We support several common patterns and a JSON-like fallback.
                    function extractName(s) {
                        if (!s) return null;
                        // JSON-style fields: "first_name" : "..."
                        let m = s.match(/"first[_-]?name"\s*[:=]\s*"([^"\n\r]+)"/i);
                        let first = m ? m[1].trim() : null;
                        m = s.match(/"last[_-]?name"\s*[:=]\s*"([^"\n\r]+)"/i);
                        let last = m ? m[1].trim() : null;
                        if (first || last) return ([first, last].filter(Boolean).join(' ')).trim() || null;

                        // Combined fields
                        m = s.match(/(?:full name|display name|name)[:\s]*["']?([^"'<\n\r]{2,})["']?/i);
                        if (m) return m[1].trim();

                        // First / Last name lines
                        const f = s.match(/first\s*name[:\s]*([^<\n\r]+)/i);
                        const l = s.match(/last\s*name[:\s]*([^<\n\r]+)/i);
                        if (f || l) return ([f && f[1].trim(), l && l[1].trim()].filter(Boolean).join(' ')).trim() || null;

                        // Name in a simple "Name: John Doe" format
                        m = s.match(/Name[:\s]*([^<\n\r]+)/i);
                        if (m) return m[1].trim();

                        return null;
                    }

                    const extractedName = extractName(originalContent);
                    let displayName = extractedName || (parsed.to && parsed.to.value && parsed.to.value[0] && parsed.to.value[0].name) || email;

                    // If available, prefer authoritative user metadata via Supabase Admin API
                    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
                        console.log('🔍 SUPABASE_SERVICE_ROLE_KEY present in env');
                        try {
                            const adminUrl = `http://auth:9999/admin/users?email=${encodeURIComponent(email)}`;
                            console.log('🔍 Querying admin API for user metadata at', adminUrl);
                            const resp = await axios.get(adminUrl, {
                                headers: { Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` },
                                timeout: 3000,
                            });
                            console.log('🔍 Admin API status:', resp.status);
                            // resp.data may be an array or object depending on GoTrue version
                            const users = Array.isArray(resp.data) ? resp.data : (resp.data && resp.data.users) ? resp.data.users : [];
                            if (users && users.length) {
                                const u = users[0];
                                console.log('🔍 Admin API returned user id:', u.id);
                                const raw = u.raw_user_meta_data || u.user_metadata || u.user_metadata_json || null;
                                let meta = null;
                                try { meta = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch (e) { meta = raw; }
                                console.log('🔍 user meta snippet:', JSON.stringify(meta)?.substring(0,200));
                                if (meta && (meta.first_name || meta.last_name)) {
                                    displayName = `${meta.first_name ?? ''} ${meta.last_name ?? ''}`.trim();
                                    console.log('👤 Found name from admin API:', displayName);
                                }
                            } else {
                                console.log('🔍 Admin API returned no users for email');
                            }
                        } catch (err) {
                            console.warn('⚠️ Could not fetch user metadata from auth admin API:', err.response?.status, err.response?.data || err.message || err);
                            console.warn(err.stack);
                        }
                    }
                    console.log(`👤 Using display name: ${displayName}`);

                    // Replace placeholders
                    // {{ .Email }} -> email (fallback)
                    // {{ .Name }} -> friendly display name
                    // {{ .ConfirmationURL }} -> confirmationUrl
                    let newHtml = signupTemplate
                        .replace(/\{\{\s*\.Name\s*\}\}/g, displayName)
                        .replace(/\{\{\s*\.Email\s*\}\}/g, email)
                        .replace(/\{\{\s*\.ConfirmationURL\s*\}\}/g, confirmationUrl);

                    // Log a short rendered greeting snippet for debugging to confirm name injection
                    try {
                        const gm = newHtml.match(/<p[^>]*>\s*Hi\s*<strong>[^<]+<\/strong>[^<]*<\/p>/i);
                        if (gm && gm[0]) console.log('🔧 Rendered greeting:', gm[0]);
                    } catch (e) {
                        /* ignore */
                    }
                    htmlContent = newHtml;
                    console.log("✅ Template injection complete.");
                } else {
                    console.warn("⚠️ Could not extract confirmation URL from original email. Sending original.");
                }
            }

            try {
                // Prepare Resend payload
                // Resend expects 'from', 'to', 'subject', 'html' or 'text'
                const payload = {
                    from: parsed.from.text, // Ensure this sender is verified in Resend
                    to: Array.isArray(parsed.to) ? parsed.to.map(t => t.text) : [parsed.to.text],
                    subject: parsed.subject,
                    html: parsed.html,
                    text: parsed.text,
                    attachments: parsed.attachments.map(att => ({
                        filename: att.filename,
                        content: att.content.toString("base64"), // Resend might expect buffer or base64? Docs say Buffer works in Node usually, but for JSON API use base64? Resend Node SDK handles it, but here we use raw API.
                        // Checking Resend API docs: 'attachments': [ { filename, content: <buffer or string> } ]
                        // We will pass Buffer directly to axios if possible? JSON doesn't support Buffer.
                        // Resend API expects content as an array of bytes when using SDK, but via REST API likely Base64 for content?
                        // Actually Resend API docs say: 'content': 'Full text content...' or Buffer.
                        // Let's safe side: use simple parsing.
                    }))
                };

                // Handle Attachments: Resend API expects content as 'base64' string automatically if passing simple json?
                // Let's refine attachment handling if needed properly.
                // For basic Auth emails, usually no attachments. Simpler is better.

                // Basic Payload for Auth
                const emailData = {
                    from: parsed.from.text,
                    to: Array.isArray(parsed.to) ? parsed.to.map(t => t.text) : [parsed.to.text],
                    subject: parsed.subject,
                    html: htmlContent,
                    text: parsed.text // Keep original text version or generate one? Keeping original is safer fallback.
                };

                console.log("🚀 Forwarding to Resend...");

                await axios.post('https://api.resend.com/emails', emailData, {
                    headers: {
                        'Authorization': `Bearer ${RESEND_API_KEY}`,
                        'Content-Type': 'application/json'
                    }
                });

                console.log("✅ Email sent successfully via Resend");
                callback(); // Accept the email
            } catch (error) {
                console.error("❌ Error sending to Resend:", error.response?.data || error.message);
                // We log it but maybe we still accept the SMTP command to avoid crashing sender, 
                // OR we return error to sender so they retry?
                // Better to return error so Supabase knows it failed.
                callback(new Error("Failed to forward email to Resend"));
            }
        });
    }
});

server.listen(25, "0.0.0.0", () => {
    console.log("🚀 SMTP Relay Server listening on 0.0.0.0:25");
});
