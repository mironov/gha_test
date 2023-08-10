#!/usr/bin/env node

import fs from 'fs';
import { parseArgs } from 'node:util';
import semver from 'semver';
import yaml from 'js-yaml';
import * as core from '@actions/core';

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

const parseLatestVersion = () => {
  const versionFile = yaml.load(fs.readFileSync('version.yaml', 'utf8'));
  const latestVersion = semver.clean(versionFile[':version'][':current']);

  console.log(`Latest release: v${latestVersion}`);

  return latestVersion;
}

const determineNextVersion = (latestVersion, level, release, sha) => {
  const bumpedVersion = semver.inc(latestVersion, level);
  let nextVersion;
  if (release) {
    nextVersion = `v${bumpedVersion}`;
  } else {
    const short_sha = sha.substring(0, 11);
    nextVersion = `v${bumpedVersion}-rc-${short_sha}`;
  }

  console.log('Next release:', nextVersion);

  return nextVersion;
}


const latestVersion = parseLatestVersion();
const nextVersion = determineNextVersion(latestVersion, input['level'], input['release'], input['commit-sha']);

core.setOutput('app_version', nextVersion);
