/**
 * Copyright (c) 2017, Daniel Imms (MIT License).
 * Copyright (c) 2018, Microsoft Corporation (MIT License).
 */

declare module 'node-pty' {
  /**
   * Forks a process as a pseudoterminal.
   * @param file The file to launch.
   * @param args The file's arguments as argv (string[]) or in a pre-escaped CommandLine format
   * (string). Note that the CommandLine option is only available on Windows and is expected to be
   * escaped properly.
   * @param options The options of the terminal.
   * @see CommandLineToArgvW https://msdn.microsoft.com/en-us/library/windows/desktop/bb776391(v=vs.85).aspx
   * @see Parsing C++ Comamnd-Line Arguments https://msdn.microsoft.com/en-us/library/17w5ykft.aspx
   * @see GetCommandLine https://msdn.microsoft.com/en-us/library/windows/desktop/ms683156.aspx
   */
  export function spawn(file: string, args: string[] | string, options: IPtyForkOptions): IPty;

  export interface IPtyForkOptions {
    name?: string;
    cols?: number;
    rows?: number;
    cwd?: string;
    env?: { [key: string]: string };
    uid?: number;
    gid?: number;
    encoding?: string;
    /**
     * Whether to use the experimental ConPTY system on Windows. When this is not set, ConPTY will
     * be used when the Windows build number is >= 18309 (it's available in 17134 and 17692 but is
     * too unstable to enable by default).
     *
     * This setting does nothing on non-Windows.
     */
    experimentalUseConpty?: boolean;
  }

  /**
   * An interface representing a pseudoterminal, on Windows this is emulated via the winpty library.
   */
  export interface IPty {
    /**
     * The process ID of the outer process.
     */
    pid: number;

    /**
     * The title of the active process.
     */
    process: string;

    /**
     * Adds a listener to the data event, fired when data is returned from the pty.
     * @param event The name of the event.
     * @param listener The callback function.
     */
    on(event: 'data', listener: (data: string) => void): void;

    /**
     * Adds a listener to the exit event, fired when the pty exits.
     * @param event The name of the event.
     * @param listener The callback function, exitCode is the exit code of the process and signal is
     * the signal that triggered the exit. signal is not supported on Windows.
     */
    on(event: 'exit', listener: (exitCode: number, signal?: number) => void): void;

    /**
     * Resizes the dimensions of the pty.
     * @param columns THe number of columns to use.
     * @param rows The number of rows to use.
     */
    resize(columns: number, rows: number): void;

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
     * Kills the pty.
     * @param signal The signal to use, defaults to SIGHUP. This parameter is not supported on
     * Windows.
     * @throws Will throw when signal is used on Windows.
     */
    kill(signal?: string): void;
  }
}
