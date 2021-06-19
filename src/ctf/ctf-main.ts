import {Creep, Id, RoomPosition, StructureTower} from "game/prototypes";
import {findPath, getObjectsByPrototype, getRange, getTime} from "game/utils";
import {CreepActionReturnCode, HEAL, OK, RANGED_ATTACK, TOUGH, TOWER_CAPACITY, TOWER_RANGE} from "game/constants";
import {Flag} from "arena/prototypes";
import {CtfEnemyCreep, CtfMyCreep} from "./ctf-interfaces";
import {CtfMatchState} from "./ctf-types";
import {PathStep} from "game/path-finder";

export class CtfMain {
    private static matchState: CtfMatchState;

    private static defensivePosRanged: RoomPosition;
    private static defensivePosHealers: RoomPosition;
    private static defensivePosCaptain: RoomPosition;

    private static captain: CtfMyCreep | null;
    private static tank: CtfMyCreep | null;
    private static rangers: CtfMyCreep[];
    private static healers: CtfMyCreep[];
    private static myTower: StructureTower;
    private static myFlag: Flag;

    private static enemyCreeps: CtfEnemyCreep[];
    private static enemyFlag: Flag;

    public static initialize(): void {
        this.rangers = [];
        this.healers = [];
        this.captain = null;
        this.tank = null;
        this.enemyCreeps = [];
        this.matchState = "defense";

        const creeps: Creep[] = getObjectsByPrototype(Creep);
        for (const creep of creeps) {
            if (creep.my) {
                const myCreep: CtfMyCreep = {
                    creep: creep,
                    type: "healer"
                };
                if (creep.body[0].type === HEAL) {
                    myCreep.type = "healer";
                    this.healers.push(myCreep);
                } else if (creep.body[0].type === RANGED_ATTACK) {
                    myCreep.type = "ranger";
                    this.rangers.push(myCreep);
                } else if (creep.body[0].type === TOUGH) {
                    if (this.captain == null) {
                        myCreep.type = "captain";
                        this.captain = myCreep;
                    } else {
                        myCreep.type = "tank";
                        this.tank = myCreep;
                    }
                } else {
                    console.log(`ERROR: Unknown first body type ${creep.body[0].type}`);
                }
            } else {
                const enemyCreep: CtfEnemyCreep = {
                    creep: creep,
                    deathPriority: 0
                };
                if (creep.body[0].type === HEAL) {
                    enemyCreep.deathPriority = 3;
                } else if (creep.body[0].type === RANGED_ATTACK) {
                    enemyCreep.deathPriority = 2;
                } else if (creep.body[0].type === TOUGH) {
                    enemyCreep.deathPriority = 1;
                } else {
                    console.log(`ERROR: Unknown first body type ${creep.body[0].type}`);
                }
                this.enemyCreeps.push(enemyCreep);
            }
        }

        this.enemyCreeps.sort((a, b) => {
            return b.deathPriority - a.deathPriority;
        })

        if (this.captain == null) {
            console.log("ERROR: No captain found");
            return;
        }

        const towers: StructureTower[] = getObjectsByPrototype(StructureTower);
        for (const tower of towers) {
            if (tower.my) {
                this.myTower = tower;
            }
        }
        const flags: Flag[] = getObjectsByPrototype(Flag);
        for (const flag of flags) {
            if (flag.my) {
                this.myFlag = flag;
            } else {
                this.enemyFlag = flag;
            }
        }

        const CAPTAIN_PATH_STEPS_DEFENSE: number = 2;
        const RANGED_PATH_STEPS_DEFENSE: number = 1;
        const HEALER_PATH_STEPS_DEFENSE: number = 0;

        const pathFromFlags: PathStep[] = findPath(this.captain.creep, this.enemyFlag);
        this.defensivePosCaptain = pathFromFlags[CAPTAIN_PATH_STEPS_DEFENSE];
        this.defensivePosRanged = pathFromFlags[RANGED_PATH_STEPS_DEFENSE];
        this.defensivePosHealers = pathFromFlags[HEALER_PATH_STEPS_DEFENSE];
    }

    public static run(): void {
        this.clearOutCreeps();

        this.progressStates();

        // Calculating hurt creeps
        const myHurtCreeps: CtfMyCreep[] = [];
        for (const healer of this.healers) {
            if (healer.creep.hits < healer.creep.hitsMax) {
                myHurtCreeps.push(healer);
            }
        }
        for (const ranger of this.rangers) {
            if (ranger.creep.hits < ranger.creep.hitsMax) {
                myHurtCreeps.push(ranger);
            }
        }
        if (this.captain != null &&
            this.captain.creep.hits < this.captain.creep.hitsMax) {
            myHurtCreeps.push(this.captain);
        }
        if (this.tank != null &&
            this.tank.creep.hits < this.tank.creep.hitsMax) {
            myHurtCreeps.push(this.tank);
        }

        // Running creeps
        for (const ranger of this.rangers) {
            this.runRanger(ranger);
        }

        for (const healer of this.healers) {
            this.runHealer(healer, myHurtCreeps);
        }

        if (this.captain != null) {
            this.runCaptain(this.captain);
        }

        if (this.tank != null) {
            this.runTank(this.tank);
        }

        this.runTower();
    }

    private static runTank(tank: CtfMyCreep): void {
        tank.creep.moveTo(this.myFlag);
        let attackResult: CreepActionReturnCode | null = null;
        for (const enemyCreep of this.enemyCreeps) {
            attackResult = tank.creep.attack(enemyCreep.creep);

            if (attackResult === OK) {
                break;
            }
        }
    }

    private static runCaptain(captain: CtfMyCreep): void {
        // Movement logic
        if (this.matchState === "defense") {
            captain.creep.moveTo(this.defensivePosCaptain);
        } else if (this.matchState === "engage") {
            const DONT_MOVE_TO_ENEMY_OVER: number = 10;
            for (const enemyCreep of this.enemyCreeps) {
                if (getRange(captain.creep, enemyCreep.creep) <= DONT_MOVE_TO_ENEMY_OVER) {
                    captain.creep.moveTo(enemyCreep.creep);
                    break;
                }
            }
        } else {
            captain.creep.moveTo(this.enemyFlag);
        }
        let attackResult: CreepActionReturnCode | null = null;
        for (const enemyCreep of this.enemyCreeps) {
            attackResult = captain.creep.attack(enemyCreep.creep);

            if (attackResult === OK) {
                break;
            }
        }
    }

    private static runRanger(ranger: CtfMyCreep): void {
        // Movement logic
        if (this.matchState === "defense") {
            ranger.creep.moveTo(this.defensivePosRanged);
        } else if (this.matchState === "engage") {
            const DONT_MOVE_TO_ENEMY_OVER: number = 10;
            for (const enemyCreep of this.enemyCreeps) {
                if (getRange(ranger.creep, enemyCreep.creep) <= DONT_MOVE_TO_ENEMY_OVER) {
                    ranger.creep.moveTo(enemyCreep.creep);
                    break;
                }
            }
        } else {
            ranger.creep.moveTo(this.enemyFlag);
        }

        let attackResult: CreepActionReturnCode | null = null;
        for (const enemyCreep of this.enemyCreeps) {
            attackResult = ranger.creep.rangedAttack(enemyCreep.creep);

            if (attackResult === OK) {
                break;
            }
        }
    }

    private static runHealer(healer: CtfMyCreep, myHurtCreeps: CtfMyCreep[]): void {
        // Movement logic
        if (this.matchState === "defense") {
            healer.creep.moveTo(this.defensivePosHealers);
        } else if (this.matchState === "engage" || this.matchState === "push") {
            if (myHurtCreeps.length > 0) {
                healer.creep.moveTo(myHurtCreeps[0].creep);
            } else {
                // Move to first non healer/tank
                if (this.rangers.length > 0) {
                    healer.creep.moveTo(this.rangers[0].creep);
                } else if (this.captain != null) {
                    healer.creep.moveTo(this.captain.creep);
                }
            }
        }

        // Healing logic
        let healResult: CreepActionReturnCode | null = null;
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

    private static runTower(): void {
        if (this.myTower.cooldown > 0) {
            return;
        }

        const FIRE_WHEN_CREEP_CLOSER_THAN: number = 5;
        let closestDistance: number = 999;
        let closestCreepId: Id<Creep> | null = null;
        for (const enemyCreep of this.enemyCreeps) {
            const distance: number = getRange(this.myTower, enemyCreep.creep);
            if (distance < FIRE_WHEN_CREEP_CLOSER_THAN) {
                this.myTower.attack(enemyCreep.creep);
                return;
            } else if (distance < closestDistance) {
                closestDistance = distance;
                closestCreepId = enemyCreep.creep.id;
            }
        }

        // Still haven't fired
        const RESTORE_TIME: number = 10;
        if (closestCreepId != null &&
            closestDistance < TOWER_RANGE &&
            closestDistance >= FIRE_WHEN_CREEP_CLOSER_THAN + RESTORE_TIME &&
            this.myTower.store.energy === TOWER_CAPACITY) {
            for (const enemyCreep of this.enemyCreeps) {
                if (enemyCreep.creep.id === closestCreepId) {
                    this.myTower.attack(enemyCreep.creep);
                    break;
                }
            }
        }
    }

    private static progressStates(): void {
        const PUSH_TIME: number = 1700;
        if (this.matchState === "defense") {
            if (getTime() > PUSH_TIME) {
                console.log("push");
                this.matchState = "push";
            } else {
                const ENGAGE_WHEN_DISTANCE_UNDER: number = 12;
                for (const enemyCreep of this.enemyCreeps) {
                    if (getRange(this.defensivePosCaptain, enemyCreep.creep) < ENGAGE_WHEN_DISTANCE_UNDER) {
                        console.log("engage");
                        this.matchState = "engage";
                        break;
                    }
                }
            }
        } else if (this.matchState === "engage") {
            const PUSH_WHEN_ENEMY_HAS_LESS_THAN_X_CREEPS: number = 3;
            if (this.enemyCreeps.length < PUSH_WHEN_ENEMY_HAS_LESS_THAN_X_CREEPS ||
                getTime() >= PUSH_TIME) {
                console.log("push");
                this.matchState = "push";
            }
        }
    }

    private static clearOutCreeps(): void {
        for (let i: number = this.enemyCreeps.length - 1; i >= 0; i--) {
            if (this.enemyCreeps[i].creep.hits == null) {
                this.enemyCreeps.splice(i, 1);
            }
        }
        for (let i: number = this.rangers.length - 1; i >= 0; i--) {
            if (this.rangers[i].creep.hits == null) {
                this.rangers.splice(i, 1);
            }
        }
        for (let i: number = this.healers.length - 1; i >= 0; i--) {
            if (this.healers[i].creep.hits == null) {
                this.healers.splice(i, 1);
            }
        }
        if (this.captain != null &&
            this.captain.creep.hits == null) {
            this.captain = null;
        }
        if (this.tank != null &&
            this.tank.creep.hits == null) {
            this.tank = null;
        }
    }
}