import type { WorkoutId } from "./workout-data";
import { muscleBuildingFolderTemplateIds } from "./muscle-building-content";

/** מקור אמת לתבניות שמופיעות בתוך כל תיקיית אימון בעמוד הבית. */
export const workoutCategoryTemplateIds: Record<string, WorkoutId[]> = {
  ...muscleBuildingFolderTemplateIds,
  "women-lower-body": ["glute-shape", "glute-medius-waist", "upper-body-posture", "prenatal-postnatal"],
  longevity: ["fall-prevention", "chair-based", "bone-density", "joint-mobility-seniors"],
  "kids-youth": ["fms-youth", "youth-agility", "youth-resistance"],
  powerlifting: ["powerlifting-big-3", "powerlifting-accessories", "strongman-events"],
  olympic: ["snatch-variations", "clean-jerk"],
  calisthenics: ["calisthenics-basics", "calisthenics-static-dynamic"],
  "functional-hybrid": ["crossfit-wod", "hyrox-hybrid", "hiit-tabata"],
  "pilates-barre": ["classical-mat-pilates", "apparatus-pilates", "barre"],
  "yoga-mobility": ["yoga-asanas", "joint-cars", "myofascial-breathwork"],
  combat: ["boxing-muay-thai", "mma-bjj", "grappling-wrestling"],
  rehab: ["shoulder-prehab", "knee-hip-ankle-rehab", "mcgill-big-3"],
  "cardio-endurance": ["cardio-endurance", "aquatic-fitness"],
  "kettlebell-trx": ["kettlebell-training", "trx-training"],
};
