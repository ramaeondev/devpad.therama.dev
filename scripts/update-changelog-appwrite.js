#!/usr/bin/env node

/**
 * Update Changelog in Appwrite from Git Commits
 * Reads git commits since last update and adds them to Appwrite collection
 * Designed to run as a cron job in CI/CD
 */

const { Client, Databases, ID, Query } = require('node-appwrite');
const { execSync } = require('child_process');
const dotenv = require('dotenv');

dotenv.config();

const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID;
const APPWRITE_MASTER_API_KEY = process.env.APPWRITE_MASTER_API_KEY;
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || 'devpad_main';
const COLLECTION_ID = 'change_logs';

if (!APPWRITE_PROJECT_ID || !APPWRITE_MASTER_API_KEY) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

/**
 * Get git commits for a specific date
 */
function getCommitsForDate(date) {
  try {
    const command = `git log --since="${date} 00:00:00" --until="${date} 23:59:59" --pretty=format:"%s" --no-merges`;
    const output = execSync(command, { encoding: 'utf8' }).trim();
    
    if (!output) {
      return [];
    }
    
    return output.split('\n').filter(line => {
      // Filter out [skip ci], empty lines, and merge commits
      const trimmed = line.trim();
      return trimmed && 
             !trimmed.toLowerCase().includes('[skip ci]') &&
             !trimmed.startsWith('Merge branch') &&
             !trimmed.startsWith('Merge pull request');
    });
  } catch (error) {
    console.error(`Error getting commits for ${date}:`, error.message);
    return [];
  }
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get the latest changelog date from Appwrite
 */
async function getLatestChangelogDate(databases) {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTION_ID,
      [Query.orderDesc('date'), Query.limit(1)]
    );
    
    if (response.documents.length > 0) {
      return response.documents[0].date;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching latest changelog:', error.message);
    return null;
  }
}

/**
 * Check if a changelog entry exists for a date
 */
async function changelogExists(databases, date) {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTION_ID,
      [Query.equal('date', date)]
    );
    
    return response.documents.length > 0;
  } catch (error) {
    console.error('Error checking changelog:', error.message);
    return false;
  }
}

/**
 * Create or update changelog entry for a date
 */
async function upsertChangelog(databases, date, changes) {
  try {
    // Check if entry exists
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTION_ID,
      [Query.equal('date', date)]
    );
    
    if (response.documents.length > 0) {
      // Update existing entry
      const doc = response.documents[0];
      const existingChanges = new Set(doc.changes);
      const newChanges = changes.filter(c => !existingChanges.has(c));
      
      if (newChanges.length > 0) {
        const updatedChanges = [...doc.changes, ...newChanges];
        await databases.updateDocument(
          DATABASE_ID,
          COLLECTION_ID,
          doc.$id,
          { changes: updatedChanges }
        );
        console.log(`✅ Updated ${date}: added ${newChanges.length} new changes`);
        return 'updated';
      } else {
        console.log(`⏭️  Skipped ${date}: no new changes`);
        return 'skipped';
      }
    } else {
      // Create new entry
      await databases.createDocument(
        DATABASE_ID,
        COLLECTION_ID,
        ID.unique(),
        { date, changes }
      );
      console.log(`✅ Created ${date}: ${changes.length} changes`);
      return 'created';
    }
  } catch (error) {
    console.error(`❌ Error upserting ${date}:`, error.message);
    return 'failed';
  }
}

/**
 * Main update function
 */
async function updateChangelog() {
  const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID)
    .setKey(APPWRITE_MASTER_API_KEY);

  const databases = new Databases(client);

  try {
    console.log('🔍 Fetching latest changelog date...');
    const latestDate = await getLatestChangelogDate(databases);
    
    let startDate;
    if (latestDate) {
      console.log(`📅 Latest changelog: ${latestDate}`);
      startDate = new Date(latestDate);
      startDate.setDate(startDate.getDate() + 1); // Start from next day
    } else {
      console.log('📅 No existing changelogs, scanning last 30 days');
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
    }
    
    const today = new Date();
    const dates = [];
    
    // Generate list of dates to check
    for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
      dates.push(formatDate(new Date(d)));
    }
    
    if (dates.length === 0) {
      console.log('✅ No dates to process');
      return;
    }
    
    console.log(`📊 Processing ${dates.length} dates...`);
    
    let created = 0;
    let updated = 0;
    let skipped = 0;
    let failed = 0;
    
    for (const date of dates) {
      const commits = getCommitsForDate(date);
      
      if (commits.length === 0) {
        continue;
      }
      
      const result = await upsertChangelog(databases, date, commits);
      
      switch (result) {
        case 'created': created++; break;
        case 'updated': updated++; break;
        case 'skipped': skipped++; break;
        case 'failed': failed++; break;
      }
    }
    
    console.log('\n✅ Changelog update complete!');
    console.log(`   ➕ Created: ${created}`);
    console.log(`   ✏️  Updated: ${updated}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ❌ Failed: ${failed}`);
    
  } catch (error) {
    console.error('❌ Update failed:', error);
    process.exit(1);
  }
}

updateChangelog();
