#!/usr/bin/env node

import * as core from '@actions/core';
import { context } from '@actions/github';

import { validateLevelAndUrgency } from "./_release_utils.mjs";

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

validateLevelAndUrgency(level, urgency);

console.log('Level:', level);
console.log('Urgency:', urgency);

core.setOutput('level', level);
core.setOutput('urgency', urgency);
