import { Creep, StructureTower } from '/game/prototypes';
import { getObjectsByPrototype } from '/game/utils';

class CtfMain {
    static run() {
        console.log(`My Creeps: ${this.myCreeps.length}`);
        console.log(`Hostile Creeps: ${this.hostileCreeps.length}`);
    }
    static initialize() {
        this.myCreeps = [];
        this.hostileCreeps = [];
        const creeps = getObjectsByPrototype(Creep);
        for (const creep of creeps) {
            if (creep.my) {
                this.myCreeps.push(creep);
            }
            else {
                this.hostileCreeps.push(creep);
            }
        }
        const towers = getObjectsByPrototype(StructureTower);
        for (const tower of towers) {
            if (tower.my) {
                this.myTower = tower;
            }
        }
    }
}

export { CtfMain };
