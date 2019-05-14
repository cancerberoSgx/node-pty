/**
 * Copyright (c) 2012-2015, Christopher Jeffrey, Peter Sunde (MIT License)
 * Copyright (c) 2016, Daniel Imms (MIT License).
 * Copyright (c) 2018, Microsoft Corporation (MIT License).
 */

import { Socket } from 'net';
import { Terminal, DEFAULT_COLS, DEFAULT_ROWS } from './terminal';
import { WindowsPtyAgent } from './windowsPtyAgent';
import { IPtyForkOptions, IPtyOpenOptions } from './interfaces';
import { ArgvOrCommandLine } from './types';
import { assign } from './utils';

const DEFAULT_FILE = 'cmd.exe';
const DEFAULT_NAME = 'Windows Shell';

export class WindowsTerminal extends Terminal {
  private _isReady: boolean;
  private _deferreds: any[];
  private _agent: WindowsPtyAgent;

  constructor(file?: string, args?: ArgvOrCommandLine, opt?: IPtyForkOptions) {
    super(opt);

    // Initialize arguments
    args = args || [];
    file = file || DEFAULT_FILE;
    opt = opt || {};
    opt.env = opt.env || process.env;

    if (opt.encoding) {
      console.warn('Setting encoding on Windows is not supported');
    }

    const env = assign({}, opt.env);
    this._cols = opt.cols || DEFAULT_COLS;
    this._rows = opt.rows || DEFAULT_ROWS;
    const cwd = opt.cwd || process.cwd();
    const name = opt.name || env.TERM || DEFAULT_NAME;
    const parsedEnv = this._parseEnv(env);

    // If the terminal is ready
    this._isReady = false;

    // Functions that need to run after `ready` event is emitted.
    this._deferreds = [];

    // Create new termal.
    this._agent = new WindowsPtyAgent(file, args, parsedEnv, cwd, this._cols, this._rows, false, opt.experimentalUseConpty);
    this._socket = this._agent.outSocket;

    // Not available until `ready` event emitted.
    this._pid = this._agent.innerPid;
    this._fd = this._agent.fd;
    this._pty = this._agent.pty;

    // The forked windows terminal is not available until `ready` event is
    // emitted.
    this._socket.on('ready_datapipe', () => {

      // These events needs to be forwarded.
      ['connect', 'data', 'end', 'timeout', 'drain'].forEach(event => {
        this._socket.on(event, () => {

          // Wait until the first data event is fired then we can run deferreds.
          if (!this._isReady && event === 'data') {

            // Terminal is now ready and we can avoid having to defer method
            // calls.
            this._isReady = true;

            // Execute all deferred methods
            this._deferreds.forEach(fn => {
              // NB! In order to ensure that `this` has all its references
              // updated any variable that need to be available in `this` before
              // the deferred is run has to be declared above this forEach
              // statement.
              fn.run();
            });

            // Reset
            this._deferreds = [];

          }
        });
      });

      // Shutdown if `error` event is emitted.
      this._socket.on('error', err => {
        // Close terminal session.
        this._close();

        // EIO, happens when someone closes our child process: the only process
        // in the terminal.
        // node < 0.6.14: errno 5
        // node >= 0.6.14: read EIO
        if ((<any>err).code) {
          if (~(<any>err).code.indexOf('errno 5') || ~(<any>err).code.indexOf('EIO')) return;
        }

        // Throw anything else.
        if (this.listeners('error').length < 2) {
          throw err;
        }
      });

      // Cleanup after the socket is closed.
      this._socket.on('close', () => {
        this.emit('exit', this._agent.exitCode);
        this._close();
      });

    });

    this._file = file;
    this._name = name;

    this._readable = true;
    this._writable = true;

    this._forwardEvents();
  }

  /**
   * openpty
   */

  public static open(options?: IPtyOpenOptions): void {
    throw new Error('open() not supported on windows, use Fork() instead.');
  }

  /**
   * Events
   */

  public write(data: string, callback?: (flushed: boolean) => any): void {
    this._defer(() => {
      if (callback) {
        callback(this._agent.inSocket.write(data, () => callback(true)));
      }
      else {
        this._agent.inSocket.write(data);
      }
    });
  }

  /**
   * TTY
   */

  public resize(cols: number, rows: number): void {
    if (cols <= 0 || rows <= 0) {
      throw new Error('resizing must be done using positive cols and rows');
    }
    this._defer(() => {
      this._agent.resize(cols, rows);
      this._cols = cols;
      this._rows = rows;
    });
  }

  public destroy(): void {
    this._defer(() => {
      this.kill();
    });
  }

  public kill(signal?: string): void {
    this._defer(() => {
      if (signal) {
        throw new Error('Signals not supported on windows.');
      }
      this._close();
      this._agent.kill();
    });
  }

  private _defer(deferredFn: Function): void {

    // Ensure that this method is only used within Terminal class.
    if (!(this instanceof WindowsTerminal)) {
      throw new Error('Must be instanceof WindowsTerminal');
    }

    // If the terminal is ready, execute.
    if (this._isReady) {
      deferredFn.apply(this, null);
      return;
    }

    // Queue until terminal is ready.
    this._deferreds.push({
      run: () => deferredFn.apply(this, null)
    });
  }

  public get process(): string { return this._name; }
  public get master(): Socket { throw new Error('master is not supported on Windows'); }
  public get slave(): Socket { throw new Error('slave is not supported on Windows'); }
}
