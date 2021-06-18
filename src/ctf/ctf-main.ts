import {Creep, StructureTower} from "game/prototypes";
import {getObjectsByPrototype} from "game/utils";

export class CtfMain {
    private static myCreeps: Creep[];
    private static hostileCreeps: Creep[];
    private static myTower: StructureTower;

    public static run(): void {
        console.log(`My Creeps: ${this.myCreeps.length}`);
        console.log(`Hostile Creeps: ${this.hostileCreeps.length}`);
    }

    public static initialize(): void {
        this.myCreeps = [];
        this.hostileCreeps = [];

        const creeps: Creep[] = getObjectsByPrototype(Creep);
        for (const creep of creeps) {
            if (creep.my) {
                this.myCreeps.push(creep)
            } else {
                this.hostileCreeps.push(creep);
            }
        }
        const towers: StructureTower[] = getObjectsByPrototype(StructureTower);
        for (const tower of towers) {
            if (tower.my) {
                this.myTower = tower;
            }
        }
    }
}