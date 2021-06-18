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
        let captain = null;
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
                    if (!captain) {
                        myCreep.type = "captain";
                        captain = myCreep;
                    }
                    else {
                        myCreep.type = "tank";
                    }
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
        if (captain == null) {
            console.log("ERROR: No captain found");
            return;
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
        const CAPTAIN_PATH_STEPS_DEFENSE = 2;
        const RANGED_PATH_STEPS_DEFENSE = 1;
        const HEALER_PATH_STEPS_DEFENSE = 0;
        const pathFromFlags = findPath(captain.creep, this.enemyFlag);
        this.defensivePosCaptain = pathFromFlags[CAPTAIN_PATH_STEPS_DEFENSE];
        this.defensivePosRanged = pathFromFlags[RANGED_PATH_STEPS_DEFENSE];
        this.defensivePosHealers = pathFromFlags[HEALER_PATH_STEPS_DEFENSE];
        console.log(JSON.stringify(this.defensivePosCaptain));
        console.log(JSON.stringify(this.defensivePosHealers));
        console.log(JSON.stringify(this.defensivePosRanged));
    }
    static runMyCreep(myCreep) {
        if (myCreep.type === "ranger") {
            this.runRanger(myCreep);
        }
        else if (myCreep.type === "healer") {
            this.runHealer(myCreep);
        }
        else if (myCreep.type === "tank") {
            this.runTank(myCreep);
        }
        else if (myCreep.type === "captain") {
            this.runCaptain(myCreep);
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
    static runCaptain(captain) {
        // Movement logic
        if (this.matchState === "defense") {
            captain.creep.moveTo(this.defensivePosCaptain);
        }
        else {
            captain.creep.moveTo(this.enemyFlag);
        }
        let attackResult = null;
        for (const enemyCreep of this.enemyCreeps) {
            attackResult = captain.creep.attack(enemyCreep);
            if (attackResult === OK) {
                break;
            }
        }
    }
    static runRanger(ranger) {
        // Movement logic
        if (this.matchState === "defense") {
            ranger.creep.moveTo(this.defensivePosRanged);
        }
        else {
            ranger.creep.moveTo(this.enemyFlag);
        }
        let attackResult = null;
        for (const enemyCreep of this.enemyCreeps) {
            attackResult = ranger.creep.rangedAttack(enemyCreep);
            if (attackResult === OK) {
                break;
            }
        }
    }
    static runHealer(healer) {
        // Movement logic
        if (this.matchState === "defense") {
            healer.creep.moveTo(this.defensivePosHealers);
        }
        else {
            healer.creep.moveTo(this.enemyFlag);
        }
        // Healing logic
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
            getTime() > 300) {
            console.log("push");
            this.matchState = "push";
        }
    }
}

export { CtfMain };
