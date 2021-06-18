import { arenaInfo } from '/game';
import { CtfMain } from './ctf/ctf-main.mjs';

if (arenaInfo.name === "Capture the Flag") {
    CtfMain.initialize();
}
function loop() {
    if (arenaInfo.name === "Capture the Flag") {
        CtfMain.run();
    }
}

export { loop };
