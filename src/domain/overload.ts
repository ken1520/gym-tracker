import { LIMITS } from "@/domain/constants";
import type { Equipment } from "@/domain/constants";
import type { WorkoutSet } from "@/domain/types";

// Progressive overload on load alone. The rep count is the lifter's own scheme,
// so the target keeps it and only asks for more weight — the same set, heavier
const OVERLOAD_RATE = 0.025;

// The smallest jump each kind of equipment actually allows — a dumbbell rack
// and a plate-loaded machine cannot be nudged by the same amount
const STEP_KG: Record<Equipment, number> = {
  barbell: 2.5,
  dumbbell: 2,
  machine: 5,
  cable: 2.5,
  bodyweight: 2.5,
  kettlebell: 4,
  other: 2.5,
};

// Used when the exercise has been deleted, so its equipment is gone with it
const DEFAULT_STEP_KG = 2.5;

// Binary floats make a quotient land a hair above a whole notch, which would
// round a clean 2.5 kg jump up to 5
const EPSILON = 1e-9;

export type NextTarget = {
  weightKg: number;
  reps: number;
};

function stepFor(equipment: Equipment | undefined): number {
  return equipment ? STEP_KG[equipment] : DEFAULT_STEP_KG;
}

// Round the raise up to a notch the equipment actually has, and never past what
// the form would accept. The snap wins over the raise: a set logged off the grid
// (26 kg on a 5 kg stack) must still project onto it, or the target names a
// weight nobody can load. Only a lift carrying no weight at all fails to advance
// on its own, and takes one step from nothing
function nextWeight(weightKg: number, step: number): number {
  const raised = weightKg * (1 + OVERLOAD_RATE);
  const stepped = Math.ceil(raised / step - EPSILON) * step;
  return Math.min(LIMITS.maxWeightKg, stepped > weightKg ? stepped : weightKg + step);
}

// What to aim for next on a lift, given the best set logged for it
export function nextTarget(set: WorkoutSet, equipment: Equipment | undefined): NextTarget {
  return {
    weightKg: nextWeight(set.weightKg, stepFor(equipment)),
    reps: set.reps,
  };
}
