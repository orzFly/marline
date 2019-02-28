import ansiEscapes from 'ansi-escapes';
import exitHook from 'exit-hook';
import Navybird from 'navybird';
import termSize from 'term-size';

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
    this.redraw();
    this.softReset();
  }

  private get canDraw() {
    return this.isAvailable && this._termSize;
  }

  private setMargin() {
    if (!this.canDraw) return;

    const seq: string[] = [];
    seq.push(ansiEscapes.cursorSavePosition);
    seq.push(`\x1B[;r`);
    seq.push(ansiEscapes.cursorRestorePosition);
    if (this.marginBottom > 0) {
      seq.push(`\x1B[s`);
      for (let i = 0; i < this.marginBottom; i++) {
        seq.push(`\n`);
      }
      seq.push(`\x1B[u`);
      seq.push(`\x1B[${this.marginBottom}B`);
      seq.push(`\x1B[${this.marginBottom}A`);
    }
    seq.push(`\x1B[s`);
    seq.push(`\x1B[${1 + this.marginTop};${this._termSize!.rows - this.marginBottom}r`);
    seq.push(`\x1B[u`);
    this.stream.write(seq.join(""));
  }

  private softReset() {
    if (!this.canDraw) return;

    const seq: string[] = [];
    seq.push(`\x1B[s`);
    seq.push(`\x1B[;r`);
    seq.push(`\x1B[u`);
    this.stream.write(seq.join(""));
  }

  public redraw() {
    if (!this._started) return;
    if (!this.canDraw) return;

    const seq: string[] = [];
    seq.push(`\x1B[s`);
    if (this.marginTop > 0) {
      for (let i = 0; i < this.marginTop; i++) {
        seq.push(`\x1B[i + 1};1H`);
        seq.push(`\x1B[2K`);
        seq.push(this.bufferTop[i]);
      }
    }
    if (this.marginBottom > 0) {
      for (let i = 0; i < this.marginBottom; i++) {
        seq.push(`\x1B[${this._termSize!.rows - this.marginBottom + i + 1};1H`);
        seq.push(`\x1B[2K`);
        seq.push(this.bufferBottom[i]);
      }
    }
    seq.push(`\x1B[u`);
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
    await Navybird.delay(100);
  }

  marline.stop();
}

main();