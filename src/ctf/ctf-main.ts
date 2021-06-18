import {Creep, RoomPosition, StructureTower} from "game/prototypes";
import {findPath, getObjectsByPrototype, getRange, getTime} from "game/utils";
import {CreepActionReturnCode, HEAL, OK, RANGED_ATTACK, TOUGH} from "game/constants";
import {Flag} from "arena/prototypes";
import {CtfEnemyCreep, CtfMyCreep} from "./ctf-interfaces";
import {CtfMatchState} from "./ctf-types";
import {PathStep} from "game/path-finder";

export class CtfMain {
    private static matchState: CtfMatchState;

    private static defensivePosRanged: RoomPosition;
    private static defensivePosHealers: RoomPosition;
    private static defensivePosCaptain: RoomPosition;

    private static myCreeps: CtfMyCreep[];
    private static myTower: StructureTower;
    private static myFlag: Flag;

    private static enemyCreeps: CtfEnemyCreep[];
    private static enemyFlag: Flag;

    public static initialize(): void {
        this.myCreeps = [];
        this.enemyCreeps = [];
        this.matchState = "defense";

        const creeps: Creep[] = getObjectsByPrototype(Creep);
        let captain: CtfMyCreep | null = null;
        for (const creep of creeps) {
            if (creep.my) {
                const myCreep: CtfMyCreep = {
                    creep: creep,
                    type: "healer"
                };
                if (creep.body[0].type === HEAL) {
                    myCreep.type = "healer";
                } else if (creep.body[0].type === RANGED_ATTACK) {
                    myCreep.type = "ranger";
                } else if (creep.body[0].type === TOUGH) {
                    if (captain == null) {
                        myCreep.type = "captain";
                        captain = myCreep;
                    } else {
                        myCreep.type = "tank";
                    }
                } else {
                    console.log(`ERROR: Unknown first body type ${creep.body[0].type}`);
                }

                this.myCreeps.push(myCreep)
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

        if (captain == null) {
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

        const pathFromFlags: PathStep[] = findPath(captain.creep, this.enemyFlag);
        this.defensivePosCaptain = pathFromFlags[CAPTAIN_PATH_STEPS_DEFENSE];
        this.defensivePosRanged = pathFromFlags[RANGED_PATH_STEPS_DEFENSE];
        this.defensivePosHealers = pathFromFlags[HEALER_PATH_STEPS_DEFENSE];
    }

    public static run(): void {
        this.progressStates();

        const myHurtCreeps: CtfMyCreep[] = [];
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

    private static runMyCreep(myCreep: CtfMyCreep, myHurtCreeps: CtfMyCreep[]): void {
        if (myCreep.type === "ranger") {
            this.runRanger(myCreep);
        } else if (myCreep.type === "healer") {
            this.runHealer(myCreep, myHurtCreeps);
        } else if (myCreep.type === "tank") {
            this.runTank(myCreep);
        } else if (myCreep.type === "captain") {
            this.runCaptain(myCreep);
        }
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
        } else if (this.matchState === "engage") {
            if (myHurtCreeps.length > 0) {
                healer.creep.moveTo(myHurtCreeps[0].creep);
            } // Not sure what else to do
        } else {
            healer.creep.moveTo(this.enemyFlag);
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

        for (const enemyCreep of this.enemyCreeps) {
            const distance: number = getRange(this.myTower, enemyCreep.creep);
            if (distance < FIRE_WHEN_CREEP_CLOSER_THAN) {
                this.myTower.attack(enemyCreep.creep);
                break;
            }
        }
    }

    private static progressStates(): void {
        if (this.matchState === "defense") {
            if (getTime() > 300) {
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
            if (getTime() > 1700) {
                console.log("push");
                this.matchState = "push";
                if (this.enemyCreeps[0].creep == null) {
                    console.log("IS NULL")
                } else {
                    console.log(this.enemyCreeps[0].creep.hits);
                }
            }
        }
    }
}