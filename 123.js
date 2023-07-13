const semver = require('semver');
const yaml = require('js-yaml');
const fs = require('fs');

const versionFile = yaml.load(fs.readFileSync('version.yaml', 'utf8'));
console.log(versionFile);
console.log(versionFile[':version'][':current']);
