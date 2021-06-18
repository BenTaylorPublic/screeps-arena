import {CtfCreepType} from "./ctf-types";
import {Creep} from "game/prototypes";

export interface CtfMyCreep {
    creep: Creep;
    type: CtfCreepType;
}