#!/usr/bin/env node

import * as core from '@actions/core';
import { context } from '@actions/github';
import process from 'node:process';

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

if (!['major', 'minor', 'patch'].includes(level)) {
  core.setFailed(`Invalid level: ${level}`);
  process.exit(1);
}
if (!['immediate', 'unobtrusive', 'none'].includes(urgency)) {
  core.setFailed(`Invalid urgency: ${urgency}`);
  process.exit(1);
}

console.log('Level:', level);
console.log('Urgency:', urgency);

core.setOutput('level', level);
core.setOutput('urgency', urgency);
