#!/usr/bin/env node

/**
 * Update Changelog in Appwrite from Git Commits
 * Reads git commits from yesterday (or specified date) and adds them to the changelog
 * Designed to run as a daily cron job in CI/CD or manually
 */

const { Client, Databases, ID, Query } = require('node-appwrite');
const { execSync } = require('child_process');
const dotenv = require('dotenv');

dotenv.config();

// Environment variables
const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID;
const APPWRITE_MASTER_API_KEY = process.env.APPWRITE_MASTER_API_KEY;
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || 'devpad_main';
const COLLECTION_ID = 'change_logs';

// Optional manual inputs
const FROM_DATE = process.env.FROM_DATE; // YYYY-MM-DD (Start of range)
const TARGET_BRANCH = process.env.TARGET_BRANCH; // e.g., 'main' or 'develop'
const DRY_RUN = process.env.DRY_RUN === 'true';

if (!DRY_RUN && (!APPWRITE_PROJECT_ID || !APPWRITE_MASTER_API_KEY)) {
  console.error('❌ Missing required environment variables (APPWRITE_PROJECT_ID, APPWRITE_MASTER_API_KEY)');
  process.exit(1);
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
 * Get commits for a specific date range
 * If fromDate is provided: fetches from fromDate 00:00 to now
 * If no fromDate: fetches for Yesterday (00:00 to 23:59) - Original Cron Behavior
 */
function getCommits(fromDateStr, branch) {
  try {
    let command;
    const branchCmd = branch ? `${branch}` : '';

    if (fromDateStr) {
      // Manual Range Mode: FROM_DATE to NOW
      console.log(`🔍 Getting commits from ${fromDateStr} to NOW ${branch ? `on branch ${branch}` : ''}`);
      command = `git log ${branchCmd} --since="${fromDateStr}T00:00:00" --pretty=format:'{"hash": "%H", "date": "%ad", "message": "%s"},' --date=iso`;
    } else {
      // Default/Cron Mode: Yesterday Only
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const yesterdayStr = formatDate(yesterday);

      console.log(`🔍 Getting commits for YESTERDAY (${yesterdayStr}) ${branch ? `on branch ${branch}` : ''}`);
      command = `git log ${branchCmd} --since="${yesterdayStr}T00:00:00" --until="${yesterdayStr}T23:59:59" --pretty=format:'{"hash": "%H", "date": "%ad", "message": "%s"},' --date=iso`;
    }

    if (DRY_RUN) {
      console.log(`[DRY RUN] Executing: ${command}`);
    }

    const result = execSync(command, { encoding: 'utf-8' }).trim();

    if (!result) {
      return [];
    }

    const commits = JSON.parse(`[${result.slice(0, -1)}]`);

    return commits
      .filter(commit => {
        const msg = commit.message.trim();
        return msg &&
          !msg.toLowerCase().includes('[skip ci]') &&
          !msg.startsWith('Merge branch') &&
          !msg.startsWith('Merge pull request');
      })
      .map(commit => `${commit.message} (${commit.hash.slice(0, 7)})`);
  } catch (error) {
    console.error('Error getting commits:', error.message);
    return [];
  }
}

/**
 * Update changelog entry in Appwrite
 */
async function updateChangelogEntry(databases, dateStr, newMessages) {
  if (DRY_RUN) {
    console.log(`[DRY RUN] Would update changelog for ${dateStr} with ${newMessages.length} messages:`);
    newMessages.forEach(msg => console.log(`  - ${msg}`));
    return true;
  }

  try {
    // Check if entry exists for the date
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTION_ID,
      [Query.equal('date', dateStr)]
    );

    if (response.documents.length > 0) {
      // Update existing entry
      const doc = response.documents[0];
      const existingChanges = new Set(doc.changes);
      const uniqueNewMessages = newMessages.filter(msg => !existingChanges.has(msg));

      if (uniqueNewMessages.length > 0) {
        const updatedChanges = [...uniqueNewMessages, ...doc.changes];
        await databases.updateDocument(
          DATABASE_ID,
          COLLECTION_ID,
          doc.$id,
          { changes: updatedChanges }
        );
        console.log(`✅ Updated ${dateStr}: added ${uniqueNewMessages.length} new changes`);
        return true;
      } else {
        console.log(`⏭️  No new changes for ${dateStr}`);
        return false;
      }
    } else {
      // Create new entry
      await databases.createDocument(
        DATABASE_ID,
        COLLECTION_ID,
        ID.unique(),
        { date: dateStr, changes: newMessages }
      );
      console.log(`✅ Created ${dateStr}: ${newMessages.length} changes`);
      return true;
    }
  } catch (error) {
    console.error(`❌ Error updating changelog:`, error.message);
    throw error;
  }
}

/**
 * Main update function
 */
async function updateChangelog() {
  const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID);

  if (APPWRITE_MASTER_API_KEY) {
    client.setKey(APPWRITE_MASTER_API_KEY);
  }

  const databases = new Databases(client);

  try {
    // Determine the date to fetch commits for
    // If FROM_DATE is explicitly provided, fetch from then until now.
    // Otherwise, fetch yesterday's commits.
    const commits = getCommits(FROM_DATE, TARGET_BRANCH);

    if (commits.length === 0) {
      console.log('✅ No new commits found');
      return;
    }

    console.log(`📝 Found ${commits.length} commits`);

    // Always log to TODAY's changelog entry
    const targetLogDate = formatDate(new Date());

    // Update changelog entry
    await updateChangelogEntry(databases, targetLogDate, commits);

    if (!DRY_RUN) {
      console.log('✅ Changelog updated successfully in Appwrite');
    }

  } catch (error) {
    console.error('❌ Update failed:', error);
    process.exit(1);
  }
}

updateChangelog();
