import path from 'path';
import os from 'os';
import fs from 'fs';
import { Writable } from 'stream';
import Command from '../lib/command.js';
import { defaultConfig } from '../lib/config.js';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(new URL(import.meta.url)));
const require = createRequire(import.meta.url);

function StringWriter(options) {
  if (!(this instanceof StringWriter)) {
    return new StringWriter(options);
  }
  Writable.call(this, options);
  this.output = '';

  this._write = function(chunk, encoding, callback) {
    this.output = this.output + chunk.toString();
    callback();
  };
}

StringWriter.prototype = new Writable();

describe('Command', function() {
  beforeEach(function() {
    this.writer = new StringWriter();
    this.console = new console.Console(this.writer);
  });

  describe('With no subcommand specified', function() {
    it('runs the serve subcommand', async function() {
      const startServer = jasmine.createSpy('startServer');
      const command = new Command({
        startServer,
        console: this.console,
        baseDir: path.resolve(__dirname, 'fixtures/sampleProject'),
      });

      await command.run([]);

      expect(startServer).toHaveBeenCalled();
    });
  });

  describe('serve', () => {
    it('starts a server', async function() {
      const startServer = jasmine.createSpy('startServer');
      const command = new Command({
        startServer,
        console: this.console,
        baseDir: path.resolve(__dirname, 'fixtures/sampleProject'),
      });

      await command.run(['serve', '--config=sampleConfig.json']);

      const options = require(path.join(
        __dirname,
        'fixtures/sampleProject/sampleConfig.json'
      ));

      expect(startServer).toHaveBeenCalledWith(options);
    });

    it('finds a default config when serving', async function() {
      const startServer = jasmine.createSpy('startServer');
      const command = new Command({
        startServer,
        console: this.console,
        baseDir: path.resolve(__dirname, 'fixtures/sampleProject'),
      });

      await command.run(['serve']);

      const options = require(path.join(
        __dirname,
        'fixtures/sampleProject/spec/support/jasmine-browser.json'
      ));

      expect(startServer).toHaveBeenCalledWith(options);
    });

    it('allows CLI args to override config file when serving', async function() {
      const startServer = jasmine.createSpy('startServer');
      const command = new Command({
        startServer,
        console: this.console,
        baseDir: path.resolve(__dirname, 'fixtures/sampleProject'),
      });

      await command.run(['serve', '--config=sampleConfig.json', '--port=2345']);

      const options = require(path.join(
        __dirname,
        'fixtures/sampleProject/sampleConfig.json'
      ));

      options.port = 2345;

      expect(startServer).toHaveBeenCalledWith(options);
    });

    it('propagates errors', async () => {
      const error = new Error('nope');
      const startServer = jasmine.createSpy('startServer');
      const command = new Command({
        startServer,
        console: this.console,
        baseDir: path.resolve(__dirname, 'fixtures/sampleProject'),
      });

      startServer.and.callFake(() => Promise.reject(error));

      await expectAsync(command.run(['serve'])).toBeRejectedWith(error);
    });
  });

  describe('runSpecs', function() {
    it('propagates errors', async () => {
      const error = new Error('nope');
      const runSpecs = jasmine.createSpy('runSpecs');
      const command = new Command({
        runSpecs,
        console: this.console,
        baseDir: path.resolve(__dirname, 'fixtures/sampleProject'),
      });

      runSpecs.and.callFake(() => Promise.reject(error));

      await expectAsync(command.run(['runSpecs'])).toBeRejectedWith(error);
    });

    describe('when --fail-fast is specified', function() {
      it('sets the stopOnSpecFailure and stopSpecOnExpectationFailure env options to true', async function() {
        const runSpecs = jasmine.createSpy('startServer');
        const command = new Command({
          runSpecs,
          console: this.console,
          baseDir: path.resolve(__dirname, 'fixtures/sampleProject'),
        });
        runSpecs.and.returnValue(Promise.resolve());

        await command.run(['runSpecs', '--fail-fast']);

        expect(runSpecs).toHaveBeenCalledWith(
          jasmine.objectContaining({
            env: {
              stopOnSpecFailure: true,
              stopSpecOnExpectationFailure: true,
            },
          })
        );
      });
    });
  });

  describe('version', function() {
    it('reports the version number', async function() {
      const jasmineBrowserVersion = require('../package.json').version;
      const command = new Command({
        jasmineCore: { version: () => '17.42' },
        console: this.console,
      });

      await command.run(['version']);

      expect(this.writer.output).toContain('jasmine-core v17.42');
      expect(this.writer.output).toContain(
        'jasmine-browser-runner v' + jasmineBrowserVersion
      );
    });
  });

  describe('init', function() {
    beforeEach(function() {
      const tempDir = fs.mkdtempSync(`${os.tmpdir()}/jasmine-browser-command-`);
      this.prevDir = process.cwd();
      process.chdir(tempDir);
    });

    afterEach(function() {
      process.chdir(this.prevDir);
    });

    describe('When spec/support/jasmine-browser.json does not exist', function() {
      it('creates the file', async function() {
        const command = new Command({
          jasmineCore: {},
          console: this.console,
        });

        await command.run(['init']);

        const actualContents = fs.readFileSync(
          'spec/support/jasmine-browser.json',
          { encoding: 'utf8' }
        );
        expect(actualContents).toEqual(defaultConfig);
      });
    });

    describe('When spec/support/jasmine-browser.json already exists', function() {
      it('does not create the file', async function() {
        const command = new Command({
          jasmineCore: {},
          console: this.console,
        });
        fs.mkdirSync('spec/support', { recursive: true });
        fs.writeFileSync(
          'spec/support/jasmine-browser.json',
          'initial contents'
        );

        await command.run(['init']);

        const actualContents = fs.readFileSync(
          'spec/support/jasmine-browser.json',
          { encoding: 'utf8' }
        );
        expect(actualContents).toEqual('initial contents');
      });
    });
  });

  describe('help', function() {
    it('wraps the help text to 80 columns', async function() {
      const command = new Command({
        jasmineCore: {},
        console: this.console,
      });

      await command.run(['help']);

      const lines = this.writer.output.split('\n');
      expect(lines.length).toBeGreaterThan(0);

      for (const line of lines) {
        expect(line.length).toBeLessThanOrEqual(80);
      }
    });

    it('includes the --no- prefix for reversable boolean options', async function() {
      const command = new Command({
        jasmineCore: {},
        console: this.console,
      });

      await command.run(['help']);

      expect(this.writer.output).toContain('--[no-]clear-reporters');
      expect(this.writer.output).toContain('--[no-]color');
      expect(this.writer.output).toContain('--[no-]random');
    });

    it('omits the --no- prefix for the fail-fast option', async function() {
      const command = new Command({
        jasmineCore: {},
        console: this.console,
      });

      await command.run(['help']);

      expect(this.writer.output).toContain('--fail-fast ');
    });
  });
});
