#!/usr/bin/env node

import * as core from '@actions/core';
import { context, getOctokit } from '@actions/github';
import { parseArgs } from 'node:util';
import process from 'node:process';

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

const octokit = getOctokit(process.env.GITHUB_TOKEN);

const parseUrgency = (urgencyInput) => {
  const notifyUsersToRefreshMap = {
    'Notify users to refresh ASAP ("immediate")': 'immediate',
    'Notify users to refresh at their convenience ("unobtrusive")': 'unobtrusive',
    'No refresh required': 'none',
  };

  return notifyUsersToRefreshMap[urgencyInput];
}

const capitalize = (string) => {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

const validateInputs = async (level, urgency) => {
  if (!['major', 'minor', 'patch'].includes(level)) {
    core.setFailed(`Invalid level: ${level}`);
    process.exit(1);
  }

  if (!['immediate', 'unobtrusive', 'none'].includes(urgency)) {
    core.setFailed(`Invalid urgency: ${urgency}`);
    process.exit(1);
  }

  // Exit if not a release branch
  if (!process.env.GITHUB_REF_NAME.startsWith('release-')) {
    core.setFailed('Not a release branch');
    process.exit(1);
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
    process.exit(1);
  }
}

const constructTitle = (level, releaseName) => {
  let title = `${capitalize(level)} Release`;
  if (releaseName) {
    title += ` - ${releaseName}`;
  }

  return title;
}

const constructBody = (level, urgency, releaseNotesUrl, deployer) => {
  let body = `The refresh requirement is set to **${urgency}**.\n\n`;
  if (releaseNotesUrl) {
    body += 'Please see the release notes for more information.\n' +
            `Release notes: ${releaseNotesUrl}\n\n`;
  }
  body += `Deployer: @${deployer}`;

  return body;
}

const createPullRequest = async (level, urgency, releaseName, releaseNotesUrl) => {
  const title = constructTitle(level, releaseName);
  const body = constructBody(level, urgency, releaseNotesUrl, context.actor);

  // Create pull request
  const { data: pullRequest } = await octokit.rest.pulls.create({
    owner: context.repo.owner,
    repo: context.repo.repo,
    head: process.env.GITHUB_REF_NAME,
    base: 'main',
    title: title,
    body: body,
    draft: true,
  });

  // Add labels to the pull request as it can't be done in the create call
  await octokit.rest.issues.addLabels({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: pullRequest.number,
    labels: ['release', `urgency:${urgency}`, `level:${input['level']}`],
  });

  return pullRequest;
}

const level = input['level'];
const urgency = parseUrgency(input['notify-users-to-refresh']);

await validateInputs(level, urgency);

const pullRequest = await createPullRequest(level, urgency, input['release-name'], input['release-notes-url']);

// Set PR outputs
core.setOutput('pull_request_number', pullRequest.number);
core.setOutput('pull_request_head_sha', pullRequest.head.sha);
core.setOutput('pull_request_head_ref', pullRequest.head.ref);
core.setOutput('pull_request_title', pullRequest.title);
