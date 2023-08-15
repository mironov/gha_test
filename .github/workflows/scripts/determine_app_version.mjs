#!/usr/bin/env node

import * as core from '@actions/core'
import { parseArgs } from 'node:util'

import { determineNextVersion, parseLatestVersion } from './lib/utils.mjs'

const { values: input } = parseArgs({
  options: {
    level: {
      type: 'string',
    },
    'commit-sha': {
      type: 'string',
    },
    release: {
      type: 'boolean',
    },
  },
})

const latestVersion = parseLatestVersion()
const nextVersion = determineNextVersion(
  latestVersion,
  input['level'],
  input['release'],
  input['commit-sha']
)

core.setOutput('app_version', nextVersion)
