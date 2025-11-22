const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const log = execSync(
  "git log --pretty=format:'%ad|%s' --date=short --reverse",
  { encoding: 'utf-8' }
);

const lines = log.split('\n');
const changelog = {};

lines.forEach(line => {
  const [date, message] = line.split('|');
  if (!date || !message) return;
  if (!changelog[date]) changelog[date] = [];
  changelog[date].push(message.trim());
});

const changelogArr = Object.entries(changelog)
  .map(([date, changes]) => ({ date, changes }))
  .sort((a, b) => b.date.localeCompare(a.date));

fs.writeFileSync(
  path.join(__dirname, '../src/assets/changelog.json'),
  JSON.stringify(changelogArr, null, 2)
);

console.log('Changelog updated!');
