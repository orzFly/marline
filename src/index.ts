import exitHook from 'exit-hook';
import termSize from 'term-size';

namespace ansiEscapes {
  export const eraseLine = '\x1B[2K';
  export const cursorSavePosition = '\x1B[s';
  export const cursorRestorePosition = '\x1B[u';
  export const cursorDown = (count: number = 1) => `\x1B[${count}B`
  export const cursorUp = (count: number = 1) => `\x1B[${count}A`
  export const cursorTo = (x: number, y: number) => `\x1B[${y};${x}H`
  export const setTopBottomMargin = (top: number = 1, bottom?: number) => `\x1B[${top};${bottom || ""}r`
  export const resetTopBottomMargin = `\x1B[;r`
}

export class Marline {
  readonly stream = process.stdout;
  readonly isAvailable = (() => {
    if (!this.stream.isTTY) return false;

    this._termSize = termSize();
    if (!this._termSize) return false;

    return true;
  })();

  readonly marginBottom: number
  readonly marginTop: number
  readonly bufferTop: string[]
  readonly bufferBottom: string[]

  constructor(options: {
    marginBottom?: number,
    marginTop?: number
  } = {}) {
    this.marginBottom = options.marginBottom === undefined ? 1 : options.marginBottom
    this.marginTop = options.marginTop === undefined ? 0 : options.marginTop

    this.bufferTop = new Array<string>(this.marginTop).fill("");
    this.bufferBottom = new Array<string>(this.marginBottom).fill("");
  }

  private _termSize?: termSize.TermSize
  get termSize() {
    return this._termSize
  }

  private handleStdoutResize$ = this.handleStdoutResize.bind(this)
  private handleStdoutResize() {
    if (!this.isAvailable) return;

    this._termSize = termSize();
    if (this._started) {
      this.setMargin();
      this.redraw();
    }
  }

  private _started: boolean = false
  get started() {
    return this._started;
  }

  start() {
    if (!this.isAvailable) return;
    if (this._started) return;
    if (activeMarline) throw new Error('Another Marline instance is running.');
    this._started = true;
    activeMarline = this;
    this.stream.on('resize', this.handleStdoutResize$);

    this.handleStdoutResize();
    this.setMargin();
    this.redrawInternal();
  }

  stop() {
    if (!this._started) return;
    this._started = false;
    activeMarline = null;
    this.stream.off('resize', this.handleStdoutResize$);

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

  private redrawInternal() {
    if (!this.canDraw) return;

    const seq: string[] = [];
    seq.push(ansiEscapes.cursorSavePosition);
    if (this.marginTop > 0) {
      for (let i = 0; i < this.marginTop; i++) {
        seq.push(ansiEscapes.cursorTo(1, i + 1));
        seq.push(ansiEscapes.eraseLine);
        seq.push(this.bufferTop[i] || "");
      }
    }
    if (this.marginBottom > 0) {
      for (let i = 0; i < this.marginBottom; i++) {
        seq.push(ansiEscapes.cursorTo(1, this._termSize!.rows - this.marginBottom + i + 1));
        seq.push(ansiEscapes.eraseLine);
        seq.push(this.bufferBottom[i] || "");
      }
    }
    seq.push(ansiEscapes.cursorRestorePosition);
    this.stream.write(seq.join(""));
  }

  public redraw() {
    if (!this._started) return;
    this.redrawInternal();
  }
}

let activeMarline: Marline | null = null;
exitHook(() => {
  if (activeMarline) activeMarline.stop();
})