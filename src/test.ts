import Navybird from "navybird";
import { Marline } from "./index";

async function main() {
  const marline = new Marline({ marginBottom: 5 });
  const interval = setInterval(() => {
    marline.bufferBottom.fill(String(Date.now()))
    marline.redraw();
  }, 100);

  await Navybird.delay(100);
  for (let i = 0; i < 100; i++) {
    if (i % 5 === 0) {
      if (marline.started) marline.stop()
      else marline.start()
    }
    console.log(i);
    await Navybird.delay(1000);
  }

  clearInterval(interval);
  // marline.stop();
}

main();