import { arenaInfo } from '/game';
import { CtfMain } from './ctf/ctf-main.mjs';

let firstTick = true;
function loop() {
    if (arenaInfo.name === "Capture the Flag") {
        if (firstTick) {
            CtfMain.initialize();
            firstTick = false;
        }
        else {
            CtfMain.run();
        }
    }
}

export { loop };
