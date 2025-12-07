const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const backupDir = path.join(__dirname, '../db_backup');

// Ensure backup directory exists
if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
}

// Generate filename with timestamp
const now = new Date();
const timestamp = now.toISOString().replace(/:/g, '-').replace(/\..+/, '');
const filename = `schema_${timestamp}.sql`;
const filePath = path.join(backupDir, filename);

const dbUrl = process.env.SUPABASE_DB_URL;

if (!dbUrl) {
    console.error('Error: SUPABASE_DB_URL is not set in .env file');
    process.exit(1);
}

console.log(`Dumping schema to ${filePath}...`);

try {
    execSync(`npx supabase db dump --db-url "${dbUrl}" -f "${filePath}"`, { stdio: 'inherit' });
    console.log('Backup completed successfully!');
} catch (error) {
    console.error('Backup failed:', error.message);
    process.exit(1);
}
