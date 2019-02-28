import Navybird from "navybird";
import { Marline } from "./index";

async function main() {
  const marline = new Marline({ marginBottom: 5 });
  marline.start();

  const interval = setInterval(() => {
    marline.bufferBottom.fill(String(Date.now()))
    marline.redraw();
  }, 100);

  await Navybird.delay(100);
  for (let i = 0; i < 100; i++) {
    console.log(i);
    await Navybird.delay(1000);
  }

  clearInterval(interval);
  // marline.stop();
}

main();