import { Creep, StructureTower } from '/game/prototypes';
import { getObjectsByPrototype, findPath, getRange, getTime } from '/game/utils';
import { HEAL, RANGED_ATTACK, TOUGH, OK } from '/game/constants';
import { Flag } from '/arena/prototypes';

class CtfMain {
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
                else if (creep.body[0].type === RANGED_ATTACK) {
                    myCreep.type = "ranger";
                }
                else if (creep.body[0].type === TOUGH) {
                    if (captain == null) {
                        myCreep.type = "captain";
                        captain = myCreep;
                    }
                    else {
                        myCreep.type = "tank";
                    }
                }
                else {
                    console.log(`ERROR: Unknown first body type ${creep.body[0].type}`);
                }
                this.myCreeps.push(myCreep);
            }
            else {
                const enemyCreep = {
                    creep: creep,
                    deathPriority: 0
                };
                if (creep.body[0].type === HEAL) {
                    enemyCreep.deathPriority = 3;
                }
                else if (creep.body[0].type === RANGED_ATTACK) {
                    enemyCreep.deathPriority = 2;
                }
                else if (creep.body[0].type === TOUGH) {
                    enemyCreep.deathPriority = 1;
                }
                else {
                    console.log(`ERROR: Unknown first body type ${creep.body[0].type}`);
                }
                this.enemyCreeps.push(enemyCreep);
            }
        }
        this.enemyCreeps.sort((a, b) => {
            return b.deathPriority - a.deathPriority;
        });
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
    }
    static run() {
        this.clearOutCreeps();
        this.progressStates();
        const myHurtCreeps = [];
        for (const myCreep of this.myCreeps) {
            if (myCreep.creep.hits < myCreep.creep.hitsMax) {
                myHurtCreeps.push(myCreep);
            }
        }
        for (const myCreep of this.myCreeps) {
            this.runMyCreep(myCreep, myHurtCreeps);
        }
        this.runTower();
    }
    static runMyCreep(myCreep, myHurtCreeps) {
        if (myCreep.type === "ranger") {
            this.runRanger(myCreep);
        }
        else if (myCreep.type === "healer") {
            this.runHealer(myCreep, myHurtCreeps);
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
            attackResult = tank.creep.attack(enemyCreep.creep);
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
        else if (this.matchState === "engage") {
            const DONT_MOVE_TO_ENEMY_OVER = 10;
            for (const enemyCreep of this.enemyCreeps) {
                if (getRange(captain.creep, enemyCreep.creep) <= DONT_MOVE_TO_ENEMY_OVER) {
                    captain.creep.moveTo(enemyCreep.creep);
                    break;
                }
            }
        }
        else {
            captain.creep.moveTo(this.enemyFlag);
        }
        let attackResult = null;
        for (const enemyCreep of this.enemyCreeps) {
            attackResult = captain.creep.attack(enemyCreep.creep);
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
        else if (this.matchState === "engage") {
            const DONT_MOVE_TO_ENEMY_OVER = 10;
            for (const enemyCreep of this.enemyCreeps) {
                if (getRange(ranger.creep, enemyCreep.creep) <= DONT_MOVE_TO_ENEMY_OVER) {
                    ranger.creep.moveTo(enemyCreep.creep);
                    break;
                }
            }
        }
        else {
            ranger.creep.moveTo(this.enemyFlag);
        }
        let attackResult = null;
        for (const enemyCreep of this.enemyCreeps) {
            attackResult = ranger.creep.rangedAttack(enemyCreep.creep);
            if (attackResult === OK) {
                break;
            }
        }
    }
    static runHealer(healer, myHurtCreeps) {
        // Movement logic
        if (this.matchState === "defense") {
            healer.creep.moveTo(this.defensivePosHealers);
        }
        else if (this.matchState === "engage" || this.matchState === "push") {
            if (myHurtCreeps.length > 0) {
                healer.creep.moveTo(myHurtCreeps[0].creep);
            }
            else {
                // Move to first non healer/tank
                for (const myCreep of this.myCreeps) {
                    if (myCreep.type !== "healer" && myCreep.type !== "tank") {
                        healer.creep.moveTo(myCreep.creep);
                        break;
                    }
                }
            }
        }
        // Healing logic
        let healResult = null;
        for (const hurtCreep of myHurtCreeps) {
            healResult = healer.creep.heal(hurtCreep.creep);
            if (healResult === OK) {
                break;
            }
        }
        if (healResult !== OK) {
            for (const hurtCreep of myHurtCreeps) {
                healResult = hurtCreep.creep.rangedHeal(hurtCreep.creep);
                if (healResult === OK) {
                    break;
                }
            }
        }
    }
    static runTower() {
        if (this.myTower.cooldown > 0) {
            return;
        }
        const FIRE_WHEN_CREEP_CLOSER_THAN = 5;
        for (const enemyCreep of this.enemyCreeps) {
            const distance = getRange(this.myTower, enemyCreep.creep);
            if (distance < FIRE_WHEN_CREEP_CLOSER_THAN) {
                this.myTower.attack(enemyCreep.creep);
                break;
            }
        }
    }
    static progressStates() {
        const PUSH_TIME = 1700;
        if (this.matchState === "defense") {
            if (getTime() > 300) {
                console.log("push");
                this.matchState = "push";
            }
            else {
                const ENGAGE_WHEN_DISTANCE_UNDER = 12;
                for (const enemyCreep of this.enemyCreeps) {
                    if (getRange(this.defensivePosCaptain, enemyCreep.creep) < ENGAGE_WHEN_DISTANCE_UNDER) {
                        console.log("engage");
                        this.matchState = "engage";
                        break;
                    }
                }
            }
        }
        else if (this.matchState === "engage") {
            const PUSH_WHEN_ENEMY_HAS_LESS_THAN_X_CREEPS = 3;
            if (this.enemyCreeps.length < PUSH_WHEN_ENEMY_HAS_LESS_THAN_X_CREEPS ||
                getTime() >= PUSH_TIME) {
                console.log("push");
                this.matchState = "push";
            }
        }
    }
    static clearOutCreeps() {
        for (let i = this.enemyCreeps.length - 1; i >= 0; i--) {
            if (this.enemyCreeps[i].creep.hits == null) {
                this.enemyCreeps.splice(i, 1);
            }
        }
        for (let i = this.myCreeps.length - 1; i >= 0; i--) {
            if (this.myCreeps[i].creep.hits == null) {
                this.myCreeps.splice(i, 1);
            }
        }
    }
}

export { CtfMain };
