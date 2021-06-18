import {arenaInfo} from "game";
import {CtfMain} from "./ctf/ctf-main";

if (arenaInfo.name === "Capture the Flag") {
    CtfMain.initialize();
}

export function loop(): void {
    if (arenaInfo.name === "Capture the Flag") {
        CtfMain.run();
    }
}