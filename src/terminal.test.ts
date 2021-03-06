/**
 * Copyright (c) 2017, Daniel Imms (MIT License).
 * Copyright (c) 2018, Microsoft Corporation (MIT License).
 */

import * as assert from 'assert';
import { WindowsTerminal } from './windowsTerminal';
import { UnixTerminal } from './unixTerminal';
import { Terminal } from './terminal';
import { spawn } from '.';
import { pollUntil } from './testUtils.test';

const terminalConstructor = (process.platform === 'win32') ? WindowsTerminal : UnixTerminal;
const SHELL = (process.platform === 'win32') ? 'cmd.exe' : '/bin/bash';

let terminalCtor: WindowsTerminal | UnixTerminal;
if (process.platform === 'win32') {
  terminalCtor = require('./windowsTerminal');
} else {
  terminalCtor = require('./unixTerminal');
}

function newTerminal(): Terminal {
  return process.platform === 'win32' ? new WindowsTerminal() : new UnixTerminal();
}


describe('Terminal', () => {
  describe('constructor', () => {
    it('should do basic type checks', () => {
      assert.throws(
        () => new (<any>terminalCtor)('a', 'b', { 'name': {} }),
        'name must be a string (not a object)'
      );
    });
  });


  describe('write basics',  () => {

    it('should emit "data"', (done) => {
      const terminal = newTerminal();
      let allTheData = '';
      terminal.on('data', (chunk) => {
        allTheData += chunk;
      });
      (<any>pollUntil)(() => {
        if (allTheData.indexOf('hello') !== -1 && allTheData.indexOf('world') !== -1) {
          // terminal.destroy();
          done();
          return true;
        }
        return false;
      });
      terminal.write('hello');
      terminal.write('world');
    });

    it('should let us know if the entire data was flushed successfully to the kernel buffer or was queued in user memory and in the later case when it finish to be consumed', (done) => {
      const shortString = 'ls';
      const terminal = newTerminal();
      terminal.write(shortString, (flushed: boolean) => {
          done && done(); // because we are notified several times and we want to call done once
          done = null;
          // terminal.destroy();
      });
    });
  });

  describe('write() data flush and "drain" event', () => {
    function buildLongInput(): string {
      const count = process.platform === 'win32' ? 8 : 6;
      let s = buildLongInput.toString() + '\f';
      for (let i = 0; i < count; i++) {
        s += s;
      }
      return s;
    }
    let shouldEmitDrain = false;
    let drainEmitted = false;


    it('should provide meanings to know if the entire data was flushed successfully to the kernel buffer or was queued in user memory', (done) => {
      let longString = buildLongInput();
      const terminal = newTerminal();
      terminal.on('drain', () => {
        drainEmitted = true;
      });
      let flushedAlready = false;
      terminal.write(longString, (flushed: boolean) => {
        if (!flushedAlready && flushed) {
          flushedAlready = true;
          done && done();
          done = null;
        }
        else {
          shouldEmitDrain = true;
        }
      });
    }).timeout(4000);

    it('should emit "drain" event to know when the kernel buffer is free again', function() {
      if (process.platform === 'win32') {
        this.skip(); // 'winpty doesn\'t support "drain" event'
      }
      else if (shouldEmitDrain) {
        assert.ok(drainEmitted, '"drain" event should be emitted when input to write cannot be flushed entirely');
      }
      else {
        assert.ok(!drainEmitted, '"drain" event shouldn\'t be emitted if write input was flushed entirely');
      }
    });
  });
  describe('getSocket', () => {
    it('should return a Socket instance', (done) => {
      const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash';
      const client = spawn(shell, [], {});
      assert.equal( client.getSocket().destroyed, false, 'socket shouldn\'t be destroyed yet' );
      client.destroy();
      setTimeout(() => { // need to wait a little so the socket get's destroyed in windows
        assert.equal(client.getSocket().destroyed, true, 'socket should be destroyed');
        done();
      }, 100);
    });
  });

  describe('automatic flow control', () => {
    it('should respect ctor flow control options', () => {
      const pty = new terminalConstructor(SHELL, [], {handleFlowControl: true, flowControlPause: 'abc', flowControlResume: '123'});
      assert.equal(pty.handleFlowControl, true);
      assert.equal((pty as any)._flowControlPause, 'abc');
      assert.equal((pty as any)._flowControlResume, '123');
    });
    // TODO: I don't think this test ever worked due to pollUntil being used incorrectly
    // it('should do flow control automatically', async function(): Promise<void> {
    //   // Flow control doesn't work on Windows
    //   if (process.platform === 'win32') {
    //     return;
    //   }

    //   this.timeout(10000);
    //   const pty = new terminalConstructor(SHELL, [], {handleFlowControl: true, flowControlPause: 'PAUSE', flowControlResume: 'RESUME'});
    //   let read: string = '';
    //   pty.on('data', data => read += data);
    //   pty.on('pause', () => read += 'paused');
    //   pty.on('resume', () => read += 'resumed');
    //   pty.write('1');
    //   pty.write('PAUSE');
    //   pty.write('2');
    //   pty.write('RESUME');
    //   pty.write('3');
    //   await pollUntil(() => {
    //     return stripEscapeSequences(read).endsWith('1pausedresumed23');
    //   }, 100, 10);
    // });
  });
});

function stripEscapeSequences(data: string): string {
  return data.replace(/\u001b\[0K/, '');
}
