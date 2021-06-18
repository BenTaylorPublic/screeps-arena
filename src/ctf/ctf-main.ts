import {Creep, StructureTower} from "game/prototypes";
import {getObjectsByPrototype, getRange} from "game/utils";
import {CreepActionReturnCode, HEAL, OK, RANGED_ATTACK, TOUGH} from "game/constants";
import {Flag} from "arena/prototypes";
import {CtfMyCreep} from "./ctf-interfaces";

export class CtfMain {
    private static myCreeps: CtfMyCreep[];
    private static myTower: StructureTower;
    private static myFlag: Flag;

    private static enemyCreeps: Creep[];
    private static enemyFlag: Flag;

    public static run(): void {
        // Running my creeps
        for (const myCreep of this.myCreeps) {
            this.runMyCreep(myCreep);
        }

        this.runTower();
    }

    public static initialize(): void {
        this.myCreeps = [];
        this.enemyCreeps = [];

        const creeps: Creep[] = getObjectsByPrototype(Creep);
        for (const creep of creeps) {
            if (creep.my) {
                const myCreep: CtfMyCreep = {
                    creep: creep,
                    type: "healer"
                };
                if (creep.body[0].type === HEAL) {
                    myCreep.type = "healer";
                } else if (creep.body[0].type === TOUGH) {
                    myCreep.type = "tank";
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
    }

    private static runMyCreep(myCreep: CtfMyCreep): void {
        if (myCreep.type === "tank") {
            this.runTank(myCreep);
        } else if (myCreep.type === "ranger") {
            this.runRanger(myCreep);
        } else if (myCreep.type === "healer") {
            this.runHealer(myCreep);
        }
    }

    private static runTank(tank: CtfMyCreep): void {
        tank.creep.moveTo(this.myFlag);
    }

    private static runRanger(ranger: CtfMyCreep): void {
        ranger.creep.moveTo(this.enemyFlag);
        let attackResult: CreepActionReturnCode | null = null;
        for (const enemyCreep of this.enemyCreeps) {
            attackResult = ranger.creep.rangedAttack(enemyCreep);

            if (attackResult === OK) {
                break;
            }
        }
    }

    private static runHealer(healer: CtfMyCreep): void {
        healer.creep.moveTo(this.enemyFlag);
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
}