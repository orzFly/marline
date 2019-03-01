import { Marline } from "..";

async function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(), ms);
  })
}

async function main() {
  const marline = new Marline({
    marginTop: 0,
    marginBottom: 5
  });

  const interval = setInterval(() => {
    marline.bufferBottom.fill(String(Date.now()))
    marline.redraw();
  }, 100);

  await delay(100);
  for (let i = 0; i < 100; i++) {
    if (i % 5 === 0) {
      if (marline.started) marline.stop()
      else marline.start()
    }
    console.log(i);
    await delay(1000);
  }

  clearInterval(interval);
  // marline.stop();
}

main();