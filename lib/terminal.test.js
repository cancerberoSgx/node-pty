"use strict";
/**
 * Copyright (c) 2017, Daniel Imms (MIT License).
 * Copyright (c) 2018, Microsoft Corporation (MIT License).
 */
Object.defineProperty(exports, "__esModule", { value: true });
var assert = require("assert");
var windowsTerminal_1 = require("./windowsTerminal");
var unixTerminal_1 = require("./unixTerminal");
var pollUntil = require("pollUntil");
var _1 = require(".");
var terminalCtor;
if (process.platform === 'win32') {
    terminalCtor = require('./windowsTerminal');
}
else {
    terminalCtor = require('./unixTerminal');
}
function newTerminal() {
    return process.platform === 'win32' ? new windowsTerminal_1.WindowsTerminal() : new unixTerminal_1.UnixTerminal();
}
describe('Terminal', function () {
    describe('constructor', function () {
        it('should do basic type checks', function () {
            assert.throws(function () { return new terminalCtor('a', 'b', { 'name': {} }); }, 'name must be a string (not a object)');
        });
    });
    describe('write basics', function () {
        it('should emit "data"', function (done) {
            var terminal = newTerminal();
            var allTheData = '';
            terminal.on('data', function (chunk) {
                allTheData += chunk;
            });
            pollUntil(function () {
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
        it('should let us know if the entire data was flushed successfully to the kernel buffer or was queued in user memory and in the later case when it finish to be consumed', function (done) {
            var shortString = 'ls';
            var terminal = newTerminal();
            terminal.write(shortString, function (flushed) {
                done && done(); // because we are notified several times and we want to call done once
                done = null;
                // terminal.destroy();
            });
        });
    });
    describe('write() data flush and "drain" event', function () {
        function buildLongInput() {
            var count = process.platform === 'win32' ? 8 : 6;
            var s = buildLongInput.toString() + '\f';
            for (var i = 0; i < count; i++) {
                s += s;
            }
            return s;
        }
        var shouldEmitDrain = false;
        var drainEmitted = false;
        it('should provide meanings to know if the entire data was flushed successfully to the kernel buffer or was queued in user memory', function (done) {
            var longString = buildLongInput();
            var terminal = newTerminal();
            terminal.on('drain', function () {
                drainEmitted = true;
            });
            var flushedAlready = false;
            terminal.write(longString, function (flushed) {
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
        it('should emit "drain" event to know when the kernel buffer is free again', function () {
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
    describe('getSocket', function () {
        it('should return a Socket instance', function (done) {
            var shell = process.platform === 'win32' ? 'powershell.exe' : 'bash';
            var client = _1.spawn(shell, [], {});
            assert.equal(client.getSocket().destroyed, false, 'socket shouldn\'t be destroyed yet');
            client.destroy();
            setTimeout(function () {
                assert.equal(client.getSocket().destroyed, true, 'socket should be destroyed');
                done();
            }, 100);
        });
    });
});
//# sourceMappingURL=terminal.test.js.map