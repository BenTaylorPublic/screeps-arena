import { Creep, StructureTower } from '/game/prototypes';
import { getObjectsByPrototype, findPath, getRange, getTime } from '/game/utils';
import { HEAL, TOUGH, RANGED_ATTACK, OK } from '/game/constants';
import { Flag } from '/arena/prototypes';

class CtfMain {
    static run() {
        this.progressStates();
        for (const myCreep of this.myCreeps) {
            this.runMyCreep(myCreep);
        }
        this.runTower();
    }
    static initialize() {
        this.myCreeps = [];
        this.enemyCreeps = [];
        this.matchState = "defense";
        const creeps = getObjectsByPrototype(Creep);
        for (const creep of creeps) {
            if (creep.my) {
                const myCreep = {
                    creep: creep,
                    type: "healer"
                };
                if (creep.body[0].type === HEAL) {
                    myCreep.type = "healer";
                }
                else if (creep.body[0].type === TOUGH) {
                    myCreep.type = "tank";
                }
                else if (creep.body[0].type === RANGED_ATTACK) {
                    myCreep.type = "ranger";
                }
                else {
                    console.log(`ERROR: Unknown first body type ${creep.body[0].type}`);
                }
                this.myCreeps.push(myCreep);
            }
            else {
                this.enemyCreeps.push(creep);
            }
        }
        const towers = getObjectsByPrototype(StructureTower);
        for (const tower of towers) {
            if (tower.my) {
                this.myTower = tower;
            }
        }
        const flags = getObjectsByPrototype(Flag);
        for (const flag of flags) {
            if (flag.my) {
                this.myFlag = flag;
            }
            else {
                this.enemyFlag = flag;
            }
        }
        const RANGED_PATH_STEPS_DEFENSE = 10;
        const HEALER_PATH_STEPS_DEFENSE = 8;
        const pathFromFlags = findPath(this.myFlag, this.enemyFlag);
        this.defensivePosHealers = pathFromFlags[HEALER_PATH_STEPS_DEFENSE];
        this.defensivePosRanged = pathFromFlags[RANGED_PATH_STEPS_DEFENSE];
        console.log(JSON.stringify(this.defensivePosHealers));
        console.log(JSON.stringify(this.defensivePosRanged));
    }
    static runMyCreep(myCreep) {
        if (myCreep.type === "tank") {
            this.runTank(myCreep);
        }
        else if (myCreep.type === "ranger") {
            this.runRanger(myCreep);
        }
        else if (myCreep.type === "healer") {
            this.runHealer(myCreep);
        }
    }
    static runTank(tank) {
        tank.creep.moveTo(this.myFlag);
        let attackResult = null;
        for (const enemyCreep of this.enemyCreeps) {
            attackResult = tank.creep.attack(enemyCreep);
            if (attackResult === OK) {
                break;
            }
        }
    }
    static runRanger(ranger) {
        ranger.creep.moveTo(this.enemyFlag);
        let attackResult = null;
        for (const enemyCreep of this.enemyCreeps) {
            attackResult = ranger.creep.rangedAttack(enemyCreep);
            if (attackResult === OK) {
                break;
            }
        }
    }
    static runHealer(healer) {
        healer.creep.moveTo(this.enemyFlag);
        let healResult = null;
        for (const possibleCreepToHeal of this.myCreeps) {
            if (possibleCreepToHeal.creep.hits === possibleCreepToHeal.creep.hitsMax) {
                // Doesn't need heals
                continue;
            }
            healResult = healer.creep.heal(possibleCreepToHeal.creep);
            if (healResult === OK) {
                break;
            }
            healResult = possibleCreepToHeal.creep.rangedHeal(possibleCreepToHeal.creep);
            if (healResult === OK) {
                break;
            }
        }
    }
    static runTower() {
        if (this.myTower.cooldown > 0) {
            return;
        }
        const FIRE_WHEN_CREEP_CLOSER_THAN = 5;
        for (const enemyCreep of this.enemyCreeps) {
            const distance = getRange(this.myTower, enemyCreep);
            if (distance < FIRE_WHEN_CREEP_CLOSER_THAN) {
                this.myTower.attack(enemyCreep);
                break;
            }
        }
    }
    static progressStates() {
        if (this.matchState === "defense" &&
            getTime() > 100) {
            console.log("progress");
            this.matchState = "progress";
        }
    }
}

export { CtfMain };
