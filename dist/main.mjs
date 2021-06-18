import { arenaInfo } from '/game';
import { CtfMain } from './ctf/ctf-main.mjs';

function loop() {
    console.log("Hello world");
    if (arenaInfo.name === "Capture the Flag") {
        CtfMain.run();
    }
}

export { loop };
