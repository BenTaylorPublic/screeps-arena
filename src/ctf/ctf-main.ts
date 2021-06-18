import {Creep, StructureTower} from "game/prototypes";
import {getObjectsByPrototype} from "game/utils";

export class CtfMain {
    public static run(): void {
    }

    public static initialize(): void {
        const creeps: Creep[] = getObjectsByPrototype(Creep);
        console.log(`Creeps: ${creeps.length}`);
        const towers: StructureTower[] = getObjectsByPrototype(StructureTower);
        console.log(`Towers: ${towers.length}`);
    }
}