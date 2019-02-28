import exitHook from 'exit-hook';
import Navybird from 'navybird';
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

const marline = new (class Marline {
  readonly stream = process.stdout;
  readonly isAvailable = (() => {
    if (!this.stream.isTTY) return false;

    this._termSize = termSize();
    if (!this._termSize) return false;

    return true;
  })();

  readonly marginBottom = 2
  readonly marginTop = 0
  readonly bufferTop: string[] = new Array<string>(this.marginTop).fill("")
  readonly bufferBottom: string[] = new Array<string>(this.marginBottom).fill("")

  constructor() {
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
    this._started = true;

    this.stream.on('resize', this.handleStdoutResize$);
    this.setMargin();

    this.redraw();
  }

  stop() {
    if (!this._started) return;
    this._started = false;
    this.stream.off('resize', this.handleStdoutResize$);

    if (!this.isAvailable) return;
    this.resetMargin();

    this.bufferBottom.fill("");
    this.bufferTop.fill("");
    this.redraw();
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
    if (!this.canDraw) return;

    const seq: string[] = [];
    seq.push(ansiEscapes.cursorSavePosition);
    if (this.marginTop > 0) {
      for (let i = 0; i < this.marginTop; i++) {
        seq.push(ansiEscapes.cursorTo(1, i + 1));
        seq.push(ansiEscapes.eraseLine);
        seq.push(this.bufferTop[i]);
      }
    }
    if (this.marginBottom > 0) {
      for (let i = 0; i < this.marginBottom; i++) {
        seq.push(ansiEscapes.cursorTo(1, this._termSize!.rows - this.marginBottom + i + 1));
        seq.push(ansiEscapes.eraseLine);
        seq.push(this.bufferBottom[i]);
      }
    }
    seq.push(ansiEscapes.cursorRestorePosition);
    this.stream.write(seq.join(""));
  }
})();

exitHook(() => marline.stop())

async function main() {
  marline.start();

  await Navybird.delay(100);
  for (let i = 0; i < 100; i++) {
    console.log(i);
    marline.redraw();
    await Navybird.delay(1000);
  }

  marline.stop();
}

main();