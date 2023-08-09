#!/usr/bin/env node

import fs from 'fs';
import { parseArgs } from 'node:util';
import semver from 'semver';
import yaml from 'js-yaml';
import * as core from '@actions/core';
import { context } from '@actions/github'

const {
  values: { release },
} = parseArgs({
  options: {
    release: {
      type: "boolean",
    },
  },
});

const versionFile = yaml.load(fs.readFileSync('version.yaml', 'utf8'));
const latestVersion = semver.clean(versionFile[':version'][':current']);
console.log(`Latest release: v${latestVersion}`);

// parse level and urgency from labels
let level;
let urgency;
context.payload.pull_request.labels.forEach(label => {
  if (label.name.startsWith('level:')) {
    level = label.name.split(':')[1];
  }
  if (label.name.startsWith('urgency:')) {
    urgency = label.name.split(':')[1];
  }
});

// TODO: validate level and urgency for possible values

console.log('Level:', level);
console.log('Urgency:', urgency);

const bumpedVersion = semver.inc(latestVersion, level);
let nextVersion;
if (release) {
  nextVersion = `v${bumpedVersion}`;
} else {
  const short_sha = context.payload.pull_request.head.sha.substring(0, 11);
  nextVersion = `v${bumpedVersion}-rc-${short_sha}`;
}

console.log('Next release:', nextVersion);

core.setOutput('app_version', nextVersion);
core.setOutput('level', level);
core.setOutput('urgency', urgency);




// Open Release PR:
// const short_sha = '${{ needs.create_pull_request.outputs.head_sha }}'.substring(0, 11);
//
// console.log('Level:', '${{ github.event.inputs.level }}');
//
// const bumpedVersion = semver.inc(latestVersion, '${{ github.event.inputs.level }}');
// const nextVersion = `v${bumpedVersion}-rc-${short_sha}`;
//
// console.log('Next release candidate:', nextVersion);
//
// core.setOutput('app_version', nextVersion)
