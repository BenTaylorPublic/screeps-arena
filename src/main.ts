import { arenaInfo } from "game";
import { CtfMain } from "./ctf/ctf-main";

export function loop(): void {
  console.log("Hello world");
  if (arenaInfo.name === "Capture the Flag") {
    CtfMain.run();
  }
}