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
const COMMIT_DATE = process.env.COMMIT_DATE; // YYYY-MM-DD
const CHANGELOG_DATE = process.env.CHANGELOG_DATE; // YYYY-MM-DD
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
 */
function getCommits(dateStr, branch) {
  try {
    const targetDate = dateStr ? new Date(dateStr) : new Date();

    // If no date provided, default to yesterday (cron behavior)
    // If date provided, use that date
    if (!dateStr) {
      targetDate.setDate(targetDate.getDate() - 1);
    }

    const formattedDate = formatDate(targetDate);
    const branchCmd = branch ? `${branch}` : '';

    console.log(`🔍 Getting commits for ${formattedDate} ${branch ? `on branch ${branch}` : ''}`);

    const command = `git log ${branchCmd} --since="${formattedDate}T00:00:00" --until="${formattedDate}T23:59:59" --pretty=format:'{"hash": "%H", "date": "%ad", "message": "%s"},' --date=iso`;

    if (DRY_RUN) {
      console.log(`[DRY RUN] Executing: ${command}`);
      // Return dummy data for dry run if needed, or just let it try to run connection
      // For now, let's actually run the git command even in dry run as it's safe
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
    // If COMMIT_DATE is explicitly provided, use it.
    // Otherwise, undefined (which defaults to yesterday in getCommits)
    const commits = getCommits(COMMIT_DATE, TARGET_BRANCH);

    if (commits.length === 0) {
      console.log('✅ No new commits found');
      return;
    }

    console.log(`📝 Found ${commits.length} commits`);

    // Determine the date to log the entry under
    // 1. If CHANGELOG_DATE is provided, use it.
    // 2. If valid COMMIT_DATE is provided, use it (assume backfilling).
    // 3. Otherwise, use today's date (standard daily log behavior for "yesterday's" commits).
    let targetLogDate;
    if (CHANGELOG_DATE) {
      targetLogDate = CHANGELOG_DATE;
    } else if (COMMIT_DATE) {
      targetLogDate = COMMIT_DATE;
    } else {
      targetLogDate = formatDate(new Date());
    }

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
