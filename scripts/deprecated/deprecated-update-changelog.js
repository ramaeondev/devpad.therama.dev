const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHANGELOG_MD = path.join(__dirname, '../CHANGELOG.md');
const CHANGELOG_JSON = path.join(__dirname, '../src/assets/changelog.json');

const today = new Date();
const yesterday = new Date(today);
yesterday.setDate(today.getDate() - 1); // Adjust to fetch commits from yesterday

const formatDate = (date) => date.toISOString().split('T')[0];
const todayStr = formatDate(today);
const yesterdayStr = formatDate(yesterday);

const getCommits = () => {
  const command = `git log --since="${yesterdayStr}T00:00:00" --until="${yesterdayStr}T23:59:59" --pretty=format:'{"hash": "%H", "date": "%ad", "message": "%s"},' --date=iso`;
  const result = execSync(command, { encoding: 'utf-8' });
  const commits = JSON.parse(`[${result.slice(0, -1)}]`);
  return commits;
};

const updateMarkdown = (commits) => {
  let changelogContent = fs.readFileSync(CHANGELOG_MD, 'utf-8');

  // Extract existing entries for the current date
  const todayHeader = `## ${todayStr}`;
  const todayIndex = changelogContent.indexOf(todayHeader);
  let existingMessages = [];

  if (todayIndex !== -1) {
    const nextHeaderIndex = changelogContent.indexOf('## ', todayIndex + todayHeader.length);
    const todaySection = changelogContent.slice(
      todayIndex,
      nextHeaderIndex === -1 ? changelogContent.length : nextHeaderIndex
    );
    existingMessages = todaySection
      .split('\n')
      .slice(1) // Skip the header line
      .map(line => line.replace(/^- /, '').trim());
  }

  const newMessages = commits
    .map(commit => `- ${commit.message} (${commit.hash.slice(0, 7)})`)
    .filter(message => !existingMessages.includes(message));

  if (newMessages.length > 0) {
    if (todayIndex === -1) {
      changelogContent += `\n${todayHeader}\n`;
    }
    changelogContent += newMessages.join('\n') + '\n';
    fs.writeFileSync(CHANGELOG_MD, changelogContent, 'utf-8');
  }
};

const updateJson = (commits) => {
  const changelogJson = JSON.parse(fs.readFileSync(CHANGELOG_JSON, 'utf-8'));

  // Ensure the JSON follows the array pattern
  let todayEntry = changelogJson.find(entry => entry.date === todayStr);
  if (!todayEntry) {
    todayEntry = { date: todayStr, changes: [] };
    changelogJson.unshift(todayEntry); // Add new date entry at the beginning to maintain order
  }

  const existingMessages = new Set(todayEntry.changes);
  const newMessages = commits.map(commit => commit.message).filter(message => !existingMessages.has(message));

  todayEntry.changes = [
    ...newMessages,
    ...todayEntry.changes
  ];

  fs.writeFileSync(CHANGELOG_JSON, JSON.stringify(changelogJson, null, 2), 'utf-8');
};

const main = () => {
  try {
    const commits = getCommits();
    if (commits.length === 0) {
      console.log('No new commits on 29th November.');
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
