#!/usr/bin/env node

import path from 'path';
import jasmineCore from 'jasmine-core';
import Command from '../lib/command.js';
import { startServer, runSpecs } from '../index.js';

const command = new Command({
  baseDir: path.resolve(),
  jasmineCore,
  startServer,
  runSpecs,
  console,
});

command.run(process.argv.slice(2)).catch(function(error) {
  console.error(error);
  process.exitCode = 1;
});
