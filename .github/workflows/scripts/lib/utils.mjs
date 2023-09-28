import * as core from '@actions/core'
import { context, getOctokit } from '@actions/github'
import fs from 'fs'
import yaml from 'js-yaml'
import process from 'node:process'
import semver from 'semver'

export const capitalize = (string) => {
  return string.charAt(0).toUpperCase() + string.slice(1)
}

export const validateLevelAndUrgency = (level, urgency) => {
  if (!['major', 'minor', 'patch'].includes(level)) {
    core.setFailed(`Invalid level: ${level}`)
    process.exit(1)
  }

  if (!['immediate', 'unobtrusive', 'none'].includes(urgency)) {
    core.setFailed(`Invalid urgency: ${urgency}`)
    process.exit(1)
  }
}

export const validatePullRequestCanBeCreated = async (refName) => {
  // Exit if not a release branch
  if (!refName.startsWith('release-')) {
    core.setFailed('Not a release branch')
    process.exit(1)
  }

  // Exit if PR already exists
  const octokit = getOctokit(process.env.GITHUB_TOKEN)
  const { data: pullRequests } = await octokit.rest.pulls.list({
    owner: context.repo.owner,
    repo: context.repo.repo,
    head: refName,
    base: 'main',
    state: 'open',
  })

  if (pullRequests.length > 0) {
    core.setFailed('Pull request for this release already exists')
    process.exit(1)
  }
}

export const getUrgencyFromInput = (urgnecy) => {
  const notifyUsersToRefreshMap = {
    'Notify users to refresh ASAP ("immediate")': 'immediate',
    'Notify users to refresh at their convenience ("unobtrusive")':
      'unobtrusive',
    'No refresh required': 'none',
  }

  return notifyUsersToRefreshMap[urgnecy]
}

export const constructTitle = (level, releaseName) => {
  let title = `${capitalize(level)} Release`
  if (releaseName) {
    title += ` - ${releaseName}`
  }

  return title
}

export const constructBody = (level, urgency, releaseNotesUrl, deployer) => {
  let body = `The refresh requirement is set to **${urgency}**.\n\n`
  if (releaseNotesUrl) {
    body +=
      'Please see the release notes for more information.\n' +
      `Release notes: ${releaseNotesUrl}\n\n`
  }
  body += `Deployer: @${deployer}`

  return body
}

export const createPullRequest = async (
  level,
  urgency,
  releaseName,
  releaseNotesUrl
) => {
  const octokit = getOctokit(process.env.GITHUB_TOKEN)

  const title = constructTitle(level, releaseName)
  const body = constructBody(level, urgency, releaseNotesUrl, context.actor)

  // Create pull request
  const { data: pullRequest } = await octokit.rest.pulls.create({
    owner: context.repo.owner,
    repo: context.repo.repo,
    head: process.env.GITHUB_REF_NAME,
    base: 'main',
    title: title,
    body: body,
    draft: false,
  })

  // Request review from the deployer
  await octokit.rest.pulls.requestReviewers({
    owner: context.repo.owner,
    repo: context.repo.repo,
    pull_number: pullRequest.number,
    reviewers: [context.actor],
  })

  // Add labels to the pull request as it can't be done in the create call
  await octokit.rest.issues.addLabels({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: pullRequest.number,
    labels: ['release', `urgency:${urgency}`, `level:${level}`],
  })

  return pullRequest
}

export const parseLatestVersion = () => {
  const versionFile = yaml.load(fs.readFileSync('version.yaml', 'utf8'))
  const latestVersion = semver.clean(versionFile[':version'][':current'])

  console.log(`Latest release: v${latestVersion}`)

  return latestVersion
}

export const determineNextVersion = (latestVersion, level, release, sha) => {
  const bumpedVersion = semver.inc(latestVersion, level)
  let nextVersion
  if (release) {
    nextVersion = bumpedVersion
  } else {
    const short_sha = sha.substring(0, 11)
    nextVersion = `${bumpedVersion}-rc-${short_sha}`
  }

  console.log(`Next release: v${nextVersion}`)

  return nextVersion
}
