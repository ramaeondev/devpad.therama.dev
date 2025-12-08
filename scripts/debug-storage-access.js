#!/usr/bin/env node

/**
 * Debug script to check storage files and public share access
 * 
 * This script will:
 * 1. List all notes with storage:// paths
 * 2. Check if the actual files exist in storage
 * 3. Test if public shares can access the files
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Use DIRECT URL to bypass proxy and see actual storage state
const supabaseUrl = process.env.SUPABASE_DIRECT_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing environment variables:', {
    url: !!supabaseUrl,
    anonKey: !!supabaseAnonKey,
    serviceKey: !!supabaseServiceKey
  });
  process.exit(1);
}

console.log('Using Supabase URL:', supabaseUrl);
console.log('Using anon key:', supabaseAnonKey.substring(0, 20) + '...\n');

// Client with service role (bypasses RLS) - if available, otherwise use anon
const adminClient = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey);

// Client with anon key (respects RLS - like anonymous users)
const anonClient = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  console.log('🔍 Checking storage files and public share access\n');

  // Check database connectivity
  const { count: userCount, error: countErr } = await adminClient
    .from('user_profiles')
    .select('*', { count: 'exact', head: true });
  
  if (countErr) {
    console.error('❌ Database connection error:', countErr);
    return;
  }
  
  console.log(`✅ Database connected. Users: ${userCount}\n`);

  // Check total note count (using count, not fetching all data)
  const { count: noteCount } = await adminClient
    .from('notes')
    .select('*', { count: 'exact', head: true });
  
  console.log(`📊 Total notes in database: ${noteCount}\n`);

  if (noteCount === 0) {
    console.log('⚠️  No notes found. Please create a note first through the UI.');
    return;
  }

  // 1. Get ALL notes first to see what's there (limited by RLS if using anon key)
  const { data: allNotes, error: allNotesErr } = await adminClient
    .from('notes')
    .select('id, user_id, title, content, is_encrypted, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  if (allNotesErr) {
    console.error('❌ Error fetching all notes:', allNotesErr);
    console.error('   This might be an RLS issue if using anon key');
    return;
  }

  console.log(`📊 Accessible notes: ${allNotes.length}\n`);
  allNotes.forEach(n => {
    console.log(`   - ${n.title} (${n.id})`);
    const contentPreview = n.content?.substring(0, 100) || '(empty)';
    console.log(`     Content: ${contentPreview}${contentPreview.length >= 100 ? '...' : ''}`);
    console.log(`     Type: ${n.content?.startsWith('storage://') ? 'STORAGE PATH' : 'DIRECT CONTENT'}`);
    console.log(`     Is encrypted: ${n.is_encrypted}`);
    console.log(`     Created: ${n.created_at}\n`);
  });

  // 2. Get notes with storage paths
  const { data: notes, error: notesErr} = await adminClient
    .from('notes')
    .select('id, user_id, title, content, is_encrypted')
    .like('content', 'storage://%')
    .limit(10);

  if (notesErr) {
    console.error('❌ Error fetching storage notes:', notesErr);
    return;
  }

  console.log(`📊 Found ${notes.length} notes with storage paths\n`);

  for (const note of notes) {
    console.log(`\n📝 Note: ${note.title} (${note.id})`);
    console.log(`   User ID: ${note.user_id}`);
    console.log(`   Path: ${note.content}`);
    console.log(`   Encrypted: ${note.is_encrypted}`);

    // Parse storage path
    const path = note.content.replace('storage://notes/', '');
    
    // Check if file exists using admin client
    console.log(`\n   🔍 Checking file existence...`);
    try {
      const { data: listData, error: listErr } = await adminClient.storage
        .from('notes')
        .list(note.user_id, { search: `${note.id}.md` });

      if (listErr) {
        console.log(`   ❌ List error:`, listErr.message);
      } else if (!listData || listData.length === 0) {
        console.log(`   ❌ FILE DOES NOT EXIST IN STORAGE`);
      } else {
        console.log(`   ✅ File exists:`, listData[0]);
      }
    } catch (err) {
      console.log(`   ❌ Error checking file:`, err.message);
    }

    // Check if note is shared
    const { data: shares, error: sharesErr } = await adminClient
      .from('public_shares')
      .select('*')
      .eq('note_id', note.id);

    if (sharesErr) {
      console.log(`   ❌ Error checking shares:`, sharesErr);
      continue;
    }

    if (!shares || shares.length === 0) {
      console.log(`   ℹ️  Note is not shared`);
      continue;
    }

    console.log(`\n   📤 Note is shared (${shares.length} share(s))`);

    for (const share of shares) {
      console.log(`\n   🔗 Share token: ${share.share_token}`);
      console.log(`      Permission: ${share.permission}`);
      console.log(`      Expires: ${share.expires_at || 'Never'}`);
      console.log(`      Max views: ${share.max_views || 'Unlimited'}`);
      console.log(`      View count: ${share.view_count}`);

      // Test anon client access
      console.log(`\n   🧪 Testing anonymous access to storage file...`);
      try {
        const { data: urlData, error: urlErr } = await anonClient.storage
          .from('notes')
          .createSignedUrl(path, 60);

        if (urlErr) {
          console.log(`      ❌ Signed URL creation failed:`, urlErr.message);
        } else if (urlData?.signedUrl) {
          console.log(`      ✅ Signed URL created successfully`);
          
          // Try to fetch the content
          const response = await fetch(urlData.signedUrl);
          if (response.ok) {
            const content = await response.text();
            console.log(`      ✅ Content fetched (${content.length} bytes)`);
          } else {
            console.log(`      ❌ Fetch failed: ${response.status} ${response.statusText}`);
          }
        }
      } catch (err) {
        console.log(`      ❌ Error:`, err.message);
      }
    }
  }
}

main().catch(console.error);
