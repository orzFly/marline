import { Marline } from "..";

async function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(), ms);
  })
}

function randomItem<T>(array: T[]) {
  return array[Math.floor((Math.random() * array.length))]
}

function junkWord() {
  return [
    randomItem('JavaScript EMCAScript CoffeeScript IcedScript TypeScript Flow ActionScript PHP'.split(' ')),
    randomItem('是 不是 可能是 大概是 应该是 一定是 可能不是 大概不是 应该不是 一定不是'.split(' ')),
    randomItem('最好的 最差的 最先进的 最落后的 最垃圾的 最优雅的'.split(' ')),
  ]
}

async function main() {
  const marline = new Marline({
    marginTop: 0,
    marginBottom: 4
  });

  marline.on('resize', (width) => refresh(width));

  let progress = 0;
  const refresh = (width: number = marline.termSize!.columns) => {
    const barWidth = width - 6;
    const fillWidth = Math.floor(progress / 100 * barWidth);
    marline.bufferBottom[0] = `[${new Array(fillWidth).fill("=").join("")}${new Array(barWidth - fillWidth).fill(" ").join("")}] ${progress}`
    marline.bufferBottom[1] = `Top Language: ${top(0)}`;
    marline.bufferBottom[2] = `Top Verb    : ${top(1)}`;
    marline.bufferBottom[3] = `Top Attitude: ${top(2)}`;
  }

  const wordCount: { [key: string]: number }[] = [];
  function top(index: number) {
    const map = wordCount[index] || {};
    let bigKey: string = "";
    let bigValue: number = -Infinity;
    for (const key of Object.keys(map)) {
      if (map[key] > bigValue) {
        bigValue = map[key]
        bigKey = key;
      }
    }
    return `${bigValue}x ${bigKey}`;
  }

  marline.start();
  for (let i = 0; i <= 100; i++) {
    progress = i;
    refresh();
    marline.redraw();
    for (let j = 0; j < 20; j++) {
      const word = junkWord();
      console.log(word);
      word.forEach((val, index) => {
        const map = (wordCount[index] || (wordCount[index] = {}));
        if (!map[val]) map[val] = 0;
        map[val]++;
      })
      await delay(Math.random() * 50 + 10);
    }
  }

  marline.stop();

  console.log(`${top(0)} ${top(1)} ${top(2)}`)
}

main();