#!/usr/bin/env node

import * as core from '@actions/core';
import { context, getOctokit } from '@actions/github';
import { parseArgs } from 'node:util';

const {
  values: input,
} = parseArgs({
  options: {
    'level': {
      type: 'string',
    },
    'release-name': {
      type: 'string',
    },
    'release-notes-url': {
      type: 'string',
    },
    'notify-users-to-refresh': {
      type: 'string',
    },
  },
});

console.log(process.env);

const octokit = getOctokit(process.env.GITHUB_TOKEN);

// Exit if not a release branch
if (!process.env.GITHUB_REF_NAME.startsWith('release-')) {
  core.setFailed('Not a release branch');
}

// Exit if PR already exists
const { data: pullRequests } = await octokit.rest.pulls.list({
  owner: context.repo.owner,
  repo: context.repo.repo,
  head: process.env.GITHUB_REF_NAME,
  base: 'main',
  state: 'open',
});

if (pullRequests.length > 0) {
  core.setFailed('Pull request for this release already exists');
}

// Parse urgency
const notifyUsersToRefreshMap = {
  'Notify users to refresh ASAP ("immediate")': 'immediate',
  'Notify users to refresh at their convenience ("unobtrusive")': 'unobtrusive',
  'No refresh required': 'none',
};
const urgency = notifyUsersToRefreshMap[input['notify-users-to-refresh']];

const capitalize = (string) => {
  return string.charAt(0).toUpperCase() + string.slice(1);
};

let title = `${capitalize(input['level'])} Release`;
if (input['release-name'] !== '') {
  title += ` - ${input['release-name']}`;
}

let body = `The refresh requirement is set to **${urgency}**.\n\n`;
if (input['release-notes-url'] !== '') {
    body += 'Please see the release notes for more information.\n' +
            `Release notes: ${input['release-notes-url']}\n\n`;
}
body += `Deployer: @${context.actor}`;

// Create a pull request
const { data: pullRequest } = await octokit.rest.pulls.create({
  owner: context.repo.owner,
  repo: context.repo.repo,
  title: title,
  head: process.env.GITHUB_REF_NAME,
  base: 'main',
  body: body,
});

// Add labels to the pull request
await octokit.rest.issues.addLabels({
  owner: context.repo.owner,
  repo: context.repo.repo,
  issue_number: pullRequest.number,
  labels: ['release', `urgency:${urgency}`, `level:${input['level']}`],
});

// Set PR outputs
core.setOutput('pull_request_number', pullRequest.number);
core.setOutput('pull_request_head_sha', pullRequest.head.sha);
core.setOutput('pull_request_head_ref', pullRequest.head.ref);
core.setOutput('pull_request_title', pullRequest.title);
