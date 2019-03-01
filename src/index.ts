import { EventEmitter } from 'events';
import exitHook from 'exit-hook';

namespace ansiEscapes {
  export const eraseLine = '\x1B[2K';
  export const cursorDown = (count: number = 1) => `\x1B[${count}B`
  export const cursorUp = (count: number = 1) => `\x1B[${count}A`
  export const cursorTo = (x: number, y: number) => `\x1B[${y};${x}H`
  export const setTopBottomMargin = (top: number = 1, bottom?: number) => `\x1B[${top};${bottom || ""}r`
  export const resetTopBottomMargin = `\x1B[;r`

  export let cursorSavePosition = '\x1B7';
  export let cursorRestorePosition = '\x1B8';
}

interface ITermSize {
  rows: number;
  columns: number;
}

export class Marline extends EventEmitter {
  readonly stream: NodeJS.WriteStream;
  readonly marginBottom: number
  readonly marginTop: number
  readonly bufferTop: string[]
  readonly bufferBottom: string[]
  readonly isAvailable: boolean

  constructor(options: {
    stream?: NodeJS.WriteStream,
    marginBottom?: number,
    marginTop?: number
  } = {}) {
    super();

    this.stream = options.stream || process.stderr;
    this.isAvailable = false;
    do {
      if (!this.stream.isTTY) break;

      this._termSize = this.getTermSize();
      if (!this._termSize) break;

      this.isAvailable = true;
    } while (false);

    this.marginBottom = options.marginBottom === undefined ? 1 : options.marginBottom
    this.marginTop = options.marginTop === undefined ? 0 : options.marginTop

    this.bufferTop = new Array<string>(this.marginTop).fill("");
    this.bufferBottom = new Array<string>(this.marginBottom).fill("");
  }

  private getTermSize() {
    if (this.stream && this.stream.columns && this.stream.rows) {
      return { columns: this.stream.columns, rows: this.stream.rows };
    }
    return undefined;
  }

  private _termSize?: ITermSize | undefined
  get termSize() {
    return this._termSize
  }

  private handleStdoutResize$ = this.handleStdoutResize.bind(this)
  private handleStdoutResize() {
    if (!this.isAvailable) return;

    this._termSize = this.getTermSize();
    if (this._started) {
      if (this._termSize) {
        this.emit('resize', this._termSize!.columns);
      }
      this.setMargin();
      this.redraw();
    }
  }

  private _started: boolean = false
  get started() {
    return this._started;
  }

  private _resizeListened: boolean = false

  start() {
    if (!this.isAvailable) return;
    if (this._started) return;
    if (activeMarline) throw new Error('Another Marline instance is running.');
    installExitHook();
    this._started = true;
    activeMarline = this;
    if (!this._resizeListened) {
      this._resizeListened = true;
      this.stream.addListener('resize', this.handleStdoutResize$);
    }

    this.handleStdoutResize();
    this.setMargin();
    this.redrawInternal();
  }

  stop() {
    if (!this._started) return;
    this._started = false;
    activeMarline = null;
    
    if (this._resizeListened) {
      if (this.stream.removeListener) {
        try {
          this.stream.removeListener('resize', this.handleStdoutResize$);
          this._resizeListened = false;
        } catch (e) { }
      }
    }

    if (!this.isAvailable) return;
    this.resetMargin();
    this.bufferBottom.fill("");
    this.bufferTop.fill("");
    this.redrawInternal();
  }

  private get canDraw() {
    return this.isAvailable && this._termSize;
  }

  private setMargin() {
    if (!this.canDraw) return;

    const seq: string[] = [];
    seq.push(ansiEscapes.cursorSavePosition);
    seq.push(ansiEscapes.resetTopBottomMargin);
    seq.push(ansiEscapes.cursorRestorePosition);
    if (this.marginBottom > 0) {
      seq.push(ansiEscapes.cursorSavePosition);
      for (let i = 0; i < this.marginBottom; i++) {
        seq.push(`\n`);
      }
      seq.push(ansiEscapes.cursorRestorePosition);
      seq.push(ansiEscapes.cursorDown(this.marginBottom));
      seq.push(ansiEscapes.cursorUp(this.marginBottom));
    }
    seq.push(ansiEscapes.cursorSavePosition);
    seq.push(ansiEscapes.setTopBottomMargin(1 + this.marginTop, this._termSize!.rows - this.marginBottom));
    seq.push(ansiEscapes.cursorRestorePosition);
    this.stream.write(seq.join(""));
  }

  private resetMargin() {
    if (!this.canDraw) return;

    const seq: string[] = [];
    seq.push(ansiEscapes.cursorSavePosition);
    seq.push(ansiEscapes.resetTopBottomMargin);
    seq.push(ansiEscapes.cursorRestorePosition);

    this.stream.write(seq.join(""));
  }

  public redraw() {
    if (!this._started) return;
    this.redrawInternal();
  }

  private redrawInternal() {
    if (!this.canDraw) return;

    const seq: string[] = [];
    seq.push(ansiEscapes.cursorSavePosition);
    for (let i = 0; i < this.marginTop; i++) {
      seq.push(this.redrawTopLineSeq(i));
    }
    for (let i = 0; i < this.marginBottom; i++) {
      seq.push(this.redrawBottomLineSeq(i));
    }
    seq.push(ansiEscapes.cursorRestorePosition);
    this.stream.write(seq.join(""));
  }

  private redrawTopLineSeq(index: number) {
    return ansiEscapes.cursorTo(1, index + 1) +
      ansiEscapes.eraseLine +
      String(this.bufferTop[index] || "");
  }

  private redrawBottomLineSeq(index: number) {
    return ansiEscapes.cursorTo(1, this._termSize!.rows - this.marginBottom + index + 1) +
      ansiEscapes.eraseLine +
      String(this.bufferBottom[index] || "");
  }
}

export default Marline;

let activeMarline: Marline | null = null;
let exitHookInstalled = false;
function installExitHook() {
  if (exitHookInstalled) return;

  exitHookInstalled = true;
  exitHook(() => {
    if (activeMarline) activeMarline.stop();
  })
}