#!/usr/bin/env node

/**
 * Update Changelog in Appwrite from Git Commits
 * Reads git commits from yesterday and adds them to today's changelog
 * Designed to run as a daily cron job in CI/CD
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
 * Format date as YYYY-MM-DD
 */
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get commits from yesterday
 */
function getYesterdayCommits() {
  try {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    
    const yesterdayStr = formatDate(yesterday);
    
    const command = `git log --since="${yesterdayStr}T00:00:00" --until="${yesterdayStr}T23:59:59" --pretty=format:'{"hash": "%H", "date": "%ad", "message": "%s"},' --date=iso`;
    const result = execSync(command, { encoding: 'utf-8' }).trim();
    
    if (!result) {
      return [];
    }
    
    const commits = JSON.parse(`[${result.slice(0, -1)}]`);
    
    // Format commits with hash like the original logic
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
 * Update today's changelog entry in Appwrite
 */
async function updateTodayChangelog(databases, newMessages) {
  const todayStr = formatDate(new Date());
  
  try {
    // Check if entry exists for today
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTION_ID,
      [Query.equal('date', todayStr)]
    );
    
    if (response.documents.length > 0) {
      // Update existing entry
      const doc = response.documents[0];
      const existingChanges = new Set(doc.changes);
      const uniqueNewMessages = newMessages.filter(msg => !existingChanges.has(msg));
      
      if (uniqueNewMessages.length > 0) {
        // Add new messages at the beginning (like original logic)
        const updatedChanges = [...uniqueNewMessages, ...doc.changes];
        await databases.updateDocument(
          DATABASE_ID,
          COLLECTION_ID,
          doc.$id,
          { changes: updatedChanges }
        );
        console.log(`✅ Updated ${todayStr}: added ${uniqueNewMessages.length} new changes`);
        return true;
      } else {
        console.log(`⏭️  No new changes for ${todayStr}`);
        return false;
      }
    } else {
      // Create new entry for today
      await databases.createDocument(
        DATABASE_ID,
        COLLECTION_ID,
        ID.unique(),
        { date: todayStr, changes: newMessages }
      );
      console.log(`✅ Created ${todayStr}: ${newMessages.length} changes`);
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
    .setProject(APPWRITE_PROJECT_ID)
    .setKey(APPWRITE_MASTER_API_KEY);

  const databases = new Databases(client);

  try {
    console.log('🔍 Fetching commits from yesterday...');
    const commits = getYesterdayCommits();
    
    if (commits.length === 0) {
      console.log('✅ No new commits from yesterday');
      return;
    }
    
    console.log(`📝 Found ${commits.length} commits from yesterday`);
    
    // Update today's changelog entry with yesterday's commits
    await updateTodayChangelog(databases, commits);
    
    console.log('✅ Changelog updated successfully in Appwrite');
    
  } catch (error) {
    console.error('❌ Update failed:', error);
    process.exit(1);
  }
}

updateChangelog();
