import { runSpecs, DefaultReporter } from '../index.js';
import CompletionReporter from 'jasmine/lib/reporters/completion_reporter.js';

describe('index', function() {
  beforeEach(function() {
    spyOn(console, 'log');
  });

  describe('runSpecs', function() {
    describe('Choosing the reporter that reports from -core to -browser-runner', function() {
      it('uses the jsonDomReporter for Internet Explorer', async function() {
        const server = buildSpyServer();
        const runner = jasmine.createSpyObj('Runner', ['run']);
        runner.run.and.returnValue(pendingPromise());
        const options = { browser: { name: 'internet explorer' } };

        runSpecs(options, {
          Server: function() {
            return server;
          },
          Runner: function() {
            return runner;
          },
          buildWebdriver: buildStubWebdriver,
          setExitCode: () => {},
        });
        await Promise.resolve();
        await server.start.calls.mostRecent().returnValue;

        expect(runner.run).toHaveBeenCalledWith({
          ...options,
          jsonDomReporter: true,
        });
      });

      it('uses the batchReporter for non-IE browsers', async function() {
        const server = buildSpyServer();
        const runner = jasmine.createSpyObj('Runner', ['run']);
        runner.run.and.returnValue(pendingPromise());
        const options = { browser: { name: 'Classilla' } };

        runSpecs(options, {
          Server: function() {
            return server;
          },
          Runner: function() {
            return runner;
          },
          buildWebdriver: buildStubWebdriver,
          setExitCode: () => {},
        });
        await Promise.resolve();
        expect(server.start).toHaveBeenCalled();
        await server.start.calls.mostRecent().returnValue;

        expect(runner.run).toHaveBeenCalledWith({
          ...options,
          batchReporter: true,
        });
      });

      it('uses the batchReporter when the browser is not specified', async function() {
        const server = buildSpyServer();
        const runner = jasmine.createSpyObj('Runner', ['run']);
        runner.run.and.returnValue(pendingPromise());
        const options = {};

        runSpecs(options, {
          Server: function() {
            return server;
          },
          Runner: function() {
            return runner;
          },
          buildWebdriver: buildStubWebdriver,
          setExitCode: () => {},
        });
        await Promise.resolve();
        await server.start.calls.mostRecent().returnValue;

        expect(runner.run).toHaveBeenCalledWith({
          ...options,
          batchReporter: true,
        });
      });

      it('sets reporter options when no options are provided', async function() {
        const server = buildSpyServer();
        const runner = jasmine.createSpyObj('Runner', ['run']);
        runner.run.and.returnValue(pendingPromise());

        runSpecs(undefined, {
          Server: function() {
            return server;
          },
          Runner: function() {
            return runner;
          },
          buildWebdriver: buildStubWebdriver,
          setExitCode: () => {},
        });
        await Promise.resolve();
        await server.start.calls.mostRecent().returnValue;

        expect(runner.run).toHaveBeenCalledWith({
          batchReporter: true,
        });
      });
    });

    describe('Specifying the reporter that reports to the user', function() {
      it('uses the DefaultReporter when no reporter is specified', async function() {
        const Runner = jasmine.createSpy('RunnerCtor').and.returnValue({
          run: async () => ({}),
        });

        await runSpecs(
          {},
          { Runner, Server: buildSpyServer, buildWebdriver: buildStubWebdriver }
        );

        expect(Runner).toHaveBeenCalled();
        expect(Runner.calls.argsFor(0)[0].reporters).toEqual([
          jasmine.any(DefaultReporter),
        ]);
      });

      it('does not use the DefaultReporter when reporters are specified', async function() {
        const Runner = jasmine.createSpy('RunnerCtor').and.returnValue({
          run: async () => ({}),
        });

        await runSpecs(
          { reporters: ['jasmine/lib/reporters/completion_reporter.js'] },
          { Runner, Server: buildSpyServer, buildWebdriver: buildStubWebdriver }
        );

        expect(Runner).toHaveBeenCalled();
        expect(Runner.calls.argsFor(0)[0].reporters).toEqual([
          jasmine.any(CompletionReporter),
        ]);
      });

      it('supports multiple reporters', async function() {
        const Runner = jasmine.createSpy('RunnerCtor').and.returnValue({
          run: async () => ({}),
        });

        await runSpecs(
          {
            reporters: [
              'jasmine/lib/reporters/completion_reporter.js',
              './lib/default_reporter.js',
            ],
          },
          { Runner, Server: buildSpyServer, buildWebdriver: buildStubWebdriver }
        );

        expect(Runner).toHaveBeenCalled();
        expect(Runner.calls.argsFor(0)[0].reporters).toEqual([
          jasmine.any(CompletionReporter),
          jasmine.any(DefaultReporter),
        ]);
      });

      it('supports reporters that are ES modules', async function() {
        const Runner = jasmine.createSpy('RunnerCtor').and.returnValue({
          run: async () => ({}),
        });

        await runSpecs(
          {
            reporters: ['./spec/fixtures/esmReporter/reporter.js'],
          },
          { Runner, Server: buildSpyServer, buildWebdriver: buildStubWebdriver }
        );

        expect(Runner).toHaveBeenCalled();
        expect(Runner.calls.argsFor(0)[0].reporters).toEqual([
          jasmine.objectContaining({ isEsmReporter: true }),
        ]);
      });

      it('resolves reporters relative to the current working directory', async function() {
        const Runner = jasmine.createSpy('RunnerCtor').and.returnValue({
          run: async () => ({}),
        });

        process.chdir('spec');
        try {
          await runSpecs(
            {
              reporters: ['./fixtures/esmReporter/reporter.js'],
            },
            {
              Runner,
              Server: buildSpyServer,
              buildWebdriver: buildStubWebdriver,
            }
          );
        } finally {
          process.chdir('..');
        }

        expect(Runner).toHaveBeenCalled();
        expect(Runner.calls.argsFor(0)[0].reporters).toEqual([
          jasmine.objectContaining({ isEsmReporter: true }),
        ]);
      });

      it('rejects the promise when a reporter cannot be instantiated', async function() {
        const Runner = jasmine.createSpy('RunnerCtor').and.returnValue({
          run: async () => ({}),
        });

        const promise = runSpecs(
          {
            reporters: ['./no/such/module'],
          },
          { Runner, Server: buildSpyServer, buildWebdriver: buildStubWebdriver }
        );

        await expectAsync(promise).toBeRejectedWithError(
          /Failed to register reporter \.\/no\/such\/module: Cannot find module/
        );
      });

      it('supports passing an already-instantiated reporter', async function() {
        const reporter = {};
        const Runner = jasmine.createSpy('RunnerCtor').and.returnValue({
          run: async () => ({}),
        });

        await runSpecs(
          {
            reporters: [reporter],
          },
          { Runner, Server: buildSpyServer, buildWebdriver: buildStubWebdriver }
        );

        expect(Runner).toHaveBeenCalled();
        expect(Runner.calls.argsFor(0)[0].reporters[0]).toBe(reporter);
      });
    });

    describe('When the run completes', function() {
      it('resolves the returned promise to the run details', async function() {
        const server = buildSpyServer();
        server.start.and.returnValue(Promise.resolve(server));
        server.stop.and.returnValue(Promise.resolve());
        server.port.and.returnValue(0);
        const runner = jasmine.createSpyObj('Runner', ['run']);
        const details = {};
        runner.run.and.returnValue(Promise.resolve(details));

        const promise = runSpecs(
          {},
          {
            Server: function() {
              return server;
            },
            Runner: function() {
              return runner;
            },
            buildWebdriver: buildStubWebdriver,
            setExitCode: () => {},
          }
        );

        await expectAsync(promise).toBeResolvedTo(details);
      });

      it('sets the exit code to 0 when the run passes', async function() {
        const server = buildSpyServer();
        const runner = jasmine.createSpyObj('Runner', ['run']);
        runner.run.and.returnValue(
          Promise.resolve({ overallStatus: 'passed' })
        );
        const setExitCode = jasmine.createSpy('setExitCode');

        await runSpecs(
          {},
          {
            Server: function() {
              return server;
            },
            Runner: function() {
              return runner;
            },
            buildWebdriver: buildStubWebdriver,
            setExitCode,
          }
        );

        expect(setExitCode).toHaveBeenCalledWith(0);
      });

      it('sets the exit code to 3 when the run fails', async function() {
        const server = buildSpyServer();
        const runner = jasmine.createSpyObj('Runner', ['run']);
        runner.run.and.returnValue(
          Promise.resolve({ overallStatus: 'failed' })
        );
        const setExitCode = jasmine.createSpy('setExitCode');

        await runSpecs(
          {},
          {
            Server: function() {
              return server;
            },
            Runner: function() {
              return runner;
            },
            buildWebdriver: buildStubWebdriver,
            setExitCode,
          }
        );

        expect(setExitCode).toHaveBeenCalledWith(3);
      });

      it('sets the exit code to 2 when the run is incomplete', async function() {
        const server = buildSpyServer();
        const runner = jasmine.createSpyObj('Runner', ['run']);
        runner.run.and.returnValue(
          Promise.resolve({ overallStatus: 'incomplete' })
        );
        const setExitCode = jasmine.createSpy('setExitCode');

        await runSpecs(
          {},
          {
            Server: function() {
              return server;
            },
            Runner: function() {
              return runner;
            },
            buildWebdriver: buildStubWebdriver,
            setExitCode,
          }
        );

        expect(setExitCode).toHaveBeenCalledWith(2);
      });

      it('stops the server', async function() {
        const server = buildSpyServer();
        const runner = jasmine.createSpyObj('Runner', ['run']);
        let rejectRun;
        runner.run.and.returnValue(
          new Promise((res, rej) => (rejectRun = rej))
        );

        const promise = runSpecs(
          {},
          {
            Server: function() {
              return server;
            },
            Runner: function() {
              return runner;
            },
            buildWebdriver: buildStubWebdriver,
            setExitCode: () => {},
          }
        );

        expect(server.stop).not.toHaveBeenCalled();
        await expectAsync(promise).toBePending();
        const error = new Error('nope');
        rejectRun(error);
        await expectAsync(promise).toBeRejectedWithError('nope');
        expect(server.stop).toHaveBeenCalled();
      });
    });

    describe('When the run fails to complete', function() {
      it('stops the server', async function() {
        const server = jasmine.createSpyObj('Server', [
          'start',
          'stop',
          'port',
        ]);
        server.start.and.returnValue(Promise.resolve(server));
        server.stop.and.returnValue(Promise.resolve());
        server.port.and.returnValue(0);
        const runner = jasmine.createSpyObj('Runner', ['run']);
        let rejectRun;
        runner.run.and.returnValue(
          new Promise((res, rej) => (rejectRun = rej))
        );

        const promise = runSpecs(
          {},
          {
            Server: function() {
              return server;
            },
            Runner: function() {
              return runner;
            },
            buildWebdriver: buildStubWebdriver,
            setExitCode: () => {},
          }
        );

        expect(server.stop).not.toHaveBeenCalled();
        await expectAsync(promise).toBePending();
        const error = new Error('nope');
        rejectRun(error);
        await expectAsync(promise).toBeRejectedWithError('nope');
        expect(server.stop).toHaveBeenCalled();
      });
    });

    it('does not launch a browser if the server fails to start', async function() {
      const server = jasmine.createSpyObj('Server', ['start', 'stop', 'port']);
      server.start.and.returnValue(Promise.reject(new Error('nope')));
      const runner = jasmine.createSpyObj('Runner', ['run']);
      const buildWebdriver = jasmine
        .createSpy('buildWebdriver')
        .and.callFake(buildStubWebdriver);

      const promise = runSpecs(
        {},
        {
          Server: function() {
            return server;
          },
          Runner: function() {
            return runner;
          },
          buildWebdriver,
          setExitCode: () => {},
        }
      );

      await expectAsync(promise).toBeRejected();
      expect(buildWebdriver).not.toHaveBeenCalled();
    });

    it('stops the browser and server if the runner fails to start', async function() {
      const server = jasmine.createSpyObj('Server', ['start', 'stop', 'port']);
      server.start.and.returnValue(Promise.resolve(server));
      server.stop.and.returnValue(Promise.resolve());
      server.port.and.returnValue(0);
      const webdriver = jasmine.createSpyObj('webdriver', [
        'close',
        'executeScript',
      ]);
      webdriver.close.and.returnValue(Promise.resolve());

      const promise = runSpecs(
        {},
        {
          Server: function() {
            return server;
          },
          Runner: function() {
            throw new Error('nope');
          },
          buildWebdriver: function() {
            return webdriver;
          },
          setExitCode: () => {},
        }
      );

      await expectAsync(promise).toBeRejected();
      expect(webdriver.close).toHaveBeenCalled();
      expect(server.stop).toHaveBeenCalled();
    });
  });
});

function buildStubWebdriver() {
  return {
    close: () => Promise.resolve(),
    executeScript: () => Promise.resolve(),
  };
}

function buildSpyServer() {
  const server = jasmine.createSpyObj('Server', ['start', 'stop', 'port']);
  server.start.and.returnValue(Promise.resolve(server));
  server.stop.and.returnValue(Promise.resolve());
  server.port.and.returnValue(0);
  return server;
}

function pendingPromise() {
  return new Promise(function() {});
}
