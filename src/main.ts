import {arenaInfo} from "game";
import {CtfMain} from "./ctf/ctf-main";

let firstTick: boolean = true;

export function loop(): void {
    if (arenaInfo.name === "Capture the Flag") {
        if (firstTick) {
            CtfMain.initialize();
            firstTick = false;
        }
        CtfMain.run();
    }
}