#!/usr/bin/env node

import { parseArgs } from 'node:util';
import * as core from '@actions/core';

import { parseLatestVersion, determineNextVersion } from './_release_utils.mjs';

const {
  values: input,
} = parseArgs({
  options: {
    'level': {
      type: 'string',
    },
    'commit-sha': {
      type: 'string',
    },
    'release': {
      type: 'boolean',
    },
  },
});

const latestVersion = parseLatestVersion();
const nextVersion = determineNextVersion(latestVersion, input['level'], input['release'], input['commit-sha']);

core.setOutput('app_version', nextVersion);
