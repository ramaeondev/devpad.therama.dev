#!/usr/bin/env node

/**
 * Migrate Changelog Data to Appwrite
 * Reads src/assets/changelog.json and uploads to Appwrite collection
 */

const { Client, Databases, ID } = require('node-appwrite');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID;
const APPWRITE_MASTER_API_KEY = process.env.APPWRITE_MASTER_API_KEY;
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || 'devpad_main';
const COLLECTION_ID = 'change_logs';

const CHANGELOG_PATH = path.resolve(__dirname, '../src/assets/changelog.json');

if (!APPWRITE_PROJECT_ID || !APPWRITE_MASTER_API_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   - APPWRITE_PROJECT_ID');
  console.error('   - APPWRITE_MASTER_API_KEY');
  process.exit(1);
}

async function migrateChangelog() {
  const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID)
    .setKey(APPWRITE_MASTER_API_KEY);

  const databases = new Databases(client);

  try {
    // Read changelog.json
    console.log('📖 Reading changelog.json...');
    if (!fs.existsSync(CHANGELOG_PATH)) {
      console.error('❌ File not found:', CHANGELOG_PATH);
      process.exit(1);
    }

    const changelogData = JSON.parse(fs.readFileSync(CHANGELOG_PATH, 'utf8'));
    console.log(`✅ Found ${changelogData.length} changelog entries`);

    // Check if collection exists
    console.log('🔍 Verifying collection exists...');
    try {
      await databases.getCollection(DATABASE_ID, COLLECTION_ID);
      console.log('✅ Collection verified');
    } catch (error) {
      console.error('❌ Collection not found. Run setup-appwrite-changelog.js first');
      process.exit(1);
    }

    // Check for existing documents
    console.log('🔍 Checking for existing documents...');
    const existing = await databases.listDocuments(DATABASE_ID, COLLECTION_ID);
    
    if (existing.total > 0) {
      console.log(`⚠️  Found ${existing.total} existing documents`);
      console.log('   This script will skip duplicates based on date');
    }

    const existingDates = new Set(existing.documents.map(doc => doc.date));

    // Upload each changelog entry
    console.log('📤 Uploading changelog entries...');
    let uploaded = 0;
    let skipped = 0;

    for (const entry of changelogData) {
      if (existingDates.has(entry.date)) {
        console.log(`⏭️  Skipping ${entry.date} (already exists)`);
        skipped++;
        continue;
      }

      try {
        await databases.createDocument(
          DATABASE_ID,
          COLLECTION_ID,
          ID.unique(),
          {
            date: entry.date,
            changes: entry.changes
          }
        );
        console.log(`✅ Uploaded: ${entry.date} (${entry.changes.length} changes)`);
        uploaded++;
      } catch (error) {
        console.error(`❌ Failed to upload ${entry.date}:`, error.message);
      }
    }

    console.log('\n✅ Migration complete!');
    console.log(`   📤 Uploaded: ${uploaded} entries`);
    console.log(`   ⏭️  Skipped: ${skipped} entries`);
    console.log(`   📊 Total: ${uploaded + skipped} entries`);
    
    if (uploaded > 0) {
      console.log('\n📌 Next steps:');
      console.log('   1. Update UI components to fetch from Appwrite');
      console.log('   2. Test the changelog in your app');
      console.log('   3. Delete src/assets/changelog.json');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateChangelog();
