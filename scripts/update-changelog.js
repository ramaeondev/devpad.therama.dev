const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHANGELOG_MD = path.join(__dirname, '../CHANGELOG.md');
const CHANGELOG_JSON = path.join(__dirname, '../src/assets/changelog.json');

const today = new Date();
const yesterday = new Date(today);
yesterday.setDate(today.getDate() - 1);

const formatDate = (date) => date.toISOString().split('T')[0];
const todayStr = formatDate(today);
const yesterdayStr = formatDate(yesterday);

const getCommits = () => {
  const command = `git log --since="${yesterdayStr}T00:00:00" --until="${todayStr}T00:00:00" --pretty=format:'{"hash": "%H", "date": "%ad", "message": "%s"},' --date=iso`;
  const result = execSync(command, { encoding: 'utf-8' });
  const commits = JSON.parse(`[${result.slice(0, -1)}]`);
  return commits;
};

const updateMarkdown = (commits) => {
  let changelogContent = fs.readFileSync(CHANGELOG_MD, 'utf-8');
  changelogContent += `\n## ${todayStr}\n`;
  commits.forEach(commit => {
    changelogContent += `- ${commit.message} (${commit.hash.slice(0, 7)})\n`;
  });
  fs.writeFileSync(CHANGELOG_MD, changelogContent, 'utf-8');
};

const updateJson = (commits) => {
  const changelogJson = JSON.parse(fs.readFileSync(CHANGELOG_JSON, 'utf-8'));

  // Ensure the JSON follows the array pattern
  let todayEntry = changelogJson.find(entry => entry.date === todayStr);
  if (!todayEntry) {
    todayEntry = { date: todayStr, changes: [] };
    changelogJson.unshift(todayEntry); // Add new date entry at the beginning to maintain order
  }

  todayEntry.changes = [
    ...commits.map(commit => commit.message),
    ...todayEntry.changes
  ];

  fs.writeFileSync(CHANGELOG_JSON, JSON.stringify(changelogJson, null, 2), 'utf-8');
};

const main = () => {
  try {
    const commits = getCommits();
    if (commits.length === 0) {
      console.log('No new commits in the past 24 hours.');
      return;
    }
    updateMarkdown(commits);
    updateJson(commits);
    console.log('Changelog updated successfully.');
  } catch (error) {
    console.error('Error updating changelog:', error);
  }
};

main();
