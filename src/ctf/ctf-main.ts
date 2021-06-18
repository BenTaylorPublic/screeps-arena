import {Creep, RoomPosition, StructureTower} from "game/prototypes";
import {findPath, getObjectsByPrototype, getRange, getTime} from "game/utils";
import {CreepActionReturnCode, HEAL, OK, RANGED_ATTACK, TOUGH} from "game/constants";
import {Flag} from "arena/prototypes";
import {CtfMyCreep} from "./ctf-interfaces";
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

    private static enemyCreeps: Creep[];
    private static enemyFlag: Flag;

    public static run(): void {
        this.progressStates();

        for (const myCreep of this.myCreeps) {
            this.runMyCreep(myCreep);
        }

        this.runTower();
    }

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
                } else if (creep.body[0].type === TOUGH) {
                    if (!captain) {
                        myCreep.type = "captain";
                        captain = myCreep;
                    } else {
                        myCreep.type = "tank";
                    }
                } else if (creep.body[0].type === RANGED_ATTACK) {
                    myCreep.type = "ranger";
                } else {
                    console.log(`ERROR: Unknown first body type ${creep.body[0].type}`);
                }

                this.myCreeps.push(myCreep)
            } else {
                this.enemyCreeps.push(creep);
            }
        }
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

        const CAPTAIN_PATH_STEPS_DEFENSE: number = 4;
        const RANGED_PATH_STEPS_DEFENSE: number = 2;
        const HEALER_PATH_STEPS_DEFENSE: number = 0;

        const pathFromFlags: PathStep[] = findPath(captain.creep, this.enemyFlag);
        this.defensivePosCaptain = pathFromFlags[CAPTAIN_PATH_STEPS_DEFENSE];
        this.defensivePosRanged = pathFromFlags[RANGED_PATH_STEPS_DEFENSE];
        this.defensivePosHealers = pathFromFlags[HEALER_PATH_STEPS_DEFENSE];

        console.log(JSON.stringify(this.defensivePosCaptain));
        console.log(JSON.stringify(this.defensivePosHealers));
        console.log(JSON.stringify(this.defensivePosRanged));

    }

    private static runMyCreep(myCreep: CtfMyCreep): void {
        if (myCreep.type === "ranger") {
            this.runRanger(myCreep);
        } else if (myCreep.type === "healer") {
            this.runHealer(myCreep);
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
            attackResult = tank.creep.attack(enemyCreep);

            if (attackResult === OK) {
                break;
            }
        }
    }

    private static runCaptain(captain: CtfMyCreep): void {
        // Movement logic
        if (this.matchState === "defense") {
            captain.creep.moveTo(this.defensivePosCaptain);
        } else {
            captain.creep.moveTo(this.enemyFlag);
        }
        let attackResult: CreepActionReturnCode | null = null;
        for (const enemyCreep of this.enemyCreeps) {
            attackResult = captain.creep.attack(enemyCreep);

            if (attackResult === OK) {
                break;
            }
        }
    }

    private static runRanger(ranger: CtfMyCreep): void {
        // Movement logic
        if (this.matchState === "defense") {
            ranger.creep.moveTo(this.defensivePosRanged);
        } else {
            ranger.creep.moveTo(this.enemyFlag);
        }

        let attackResult: CreepActionReturnCode | null = null;
        for (const enemyCreep of this.enemyCreeps) {
            attackResult = ranger.creep.rangedAttack(enemyCreep);

            if (attackResult === OK) {
                break;
            }
        }
    }

    private static runHealer(healer: CtfMyCreep): void {
        // Movement logic
        if (this.matchState === "defense") {
            healer.creep.moveTo(this.defensivePosHealers);
        } else {
            healer.creep.moveTo(this.enemyFlag);
        }

        // Healing logic
        let healResult: CreepActionReturnCode | null = null;
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

    private static runTower(): void {
        if (this.myTower.cooldown > 0) {
            return;
        }

        const FIRE_WHEN_CREEP_CLOSER_THAN: number = 5;

        for (const enemyCreep of this.enemyCreeps) {
            const distance: number = getRange(this.myTower, enemyCreep);
            if (distance < FIRE_WHEN_CREEP_CLOSER_THAN) {
                this.myTower.attack(enemyCreep);
                break;
            }
        }
    }

    private static progressStates(): void {
        if (this.matchState === "defense" &&
            getTime() > 300) {
            console.log("push");
            this.matchState = "push";
        }
    }
}