/**
 * Copyright (c) 2016, Daniel Imms (MIT License).
 */

import * as net from 'net';

export interface IProcessEnv {
  [key: string]: string;
}

export interface ITerminal {
  /**
   * Gets the name of the process.
   */
  process: string;

  /**
   * Gets the process ID.
   */
  pid: number;

  /**
   * The socket for the master file descriptor. This is not supported on
   * Windows.
   */
  master: net.Socket;

  /**
   * The socket for the slave file descriptor. This is not supported on Windows.
   */
  slave: net.Socket;

  /**
   * Writes data to the socket.
   *
   * Optional parameter `callback` will be called with `true` if the entire data was flushed successfully to the kernel buffer or called with `false` if all or part of the data was queued in user memory. 'drain' event will be emitted when the buffer is again free.
   *
   * @param data The data to write. If you want to simulate pressing the ENTER key, like when entering a command, finish the string with the character `'\r'`
   *
   * @param callback Function called with true or false as explained in the method description. Take in consideration that this listener could be called several times.
   */
  write(data: string, callback?: (flushed: boolean) => any): void;

  /**
   * Resize the pty.
   * @param cols The number of columns.
   * @param rows The number of rows.
   */
  resize(cols: number, rows: number): void;

  /**
   * Close, kill and destroy the socket.
   */
  destroy(): void;

  /**
   * Kill the pty.
   * @param signal The signal to send, by default this is SIGHUP. This is not
   * supported on Windows.
   */
  kill(signal?: string): void;

  /**
   * Set the pty socket encoding.
   */
  setEncoding(encoding: string): void;

  /**
   * Resume the pty socket.
   */
  resume(): void;

  /**
   * Pause the pty socket.
   */
  pause(): void;

  /**
   * Alias for ITerminal.on(eventName, listener).
   */
  addListener(eventName: string, listener: (...args: any[]) => any): void;

  /**
   * Adds the listener function to the end of the listeners array for the event
   * named eventName.
   * @param eventName The event name.
   * @param listener The callback function
   */
  on(eventName: string, listener: (...args: any[]) => any): void;

  /**
   * Returns a copy of the array of listeners for the event named eventName.
   */
  listeners(eventName: string): Function[];

  /**
   * Removes the specified listener from the listener array for the event named
   * eventName.
   */
  removeListener(eventName: string, listener: (...args: any[]) => any): void;

  /**
   * Removes all listeners, or those of the specified eventName.
   */
  removeAllListeners(eventName: string): void;

  /**
   * Adds a one time listener function for the event named eventName. The next
   * time eventName is triggered, this listener is removed and then invoked.
   */
  once(eventName: string, listener: (...args: any[]) => any): void;

  /**
   * Return the socket this instance is using to communicate with the internal pty. Use at your own risk!
   */
  getSocket(): net.Socket;
}

export interface IPtyForkOptions {
  name?: string;
  cols?: number;
  rows?: number;
  cwd?: string;
  env?: IProcessEnv;
  uid?: number;
  gid?: number;
  encoding?: string;
}

export interface IPtyOpenOptions {
  cols?: number;
  rows?: number;
  encoding?: string;
}
