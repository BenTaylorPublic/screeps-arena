import { Creep, StructureTower } from '/game/prototypes';
import { getObjectsByPrototype } from '/game/utils';

class CtfMain {
    static run() {
    }
    static initialize() {
        const creeps = getObjectsByPrototype(Creep);
        console.log(`Creeps: ${creeps.length}`);
        const towers = getObjectsByPrototype(StructureTower);
        console.log(`Towers: ${towers.length}`);
    }
}

export { CtfMain };
