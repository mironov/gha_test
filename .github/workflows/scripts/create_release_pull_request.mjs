#!/usr/bin/env node

import * as core from '@actions/core'
import { parseArgs } from 'node:util'

import {
  createPullRequest,
  getUrgencyFromInput,
  validateLevelAndUrgency,
  validatePullRequest,
} from './lib/utils.mjs'

const { values: input } = parseArgs({
  options: {
    level: {
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
})

const level = input['level']
const urgency = getUrgencyFromInput(input['notify-users-to-refresh'])

validateLevelAndUrgency(level, urgency)
await validatePullRequest(level, urgency)

const pullRequest = await createPullRequest(
  level,
  urgency,
  input['release-name'],
  input['release-notes-url']
)

// Set PR outputs
core.setOutput('pull_request_number', pullRequest.number)
core.setOutput('pull_request_head_sha', pullRequest.head.sha)
core.setOutput('pull_request_head_ref', pullRequest.head.ref)
core.setOutput('pull_request_title', pullRequest.title)
