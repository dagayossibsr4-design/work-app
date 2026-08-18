export type MacroDistribution = {
  proteinGrams: number;
  carbohydratesGrams: number;
  fatsGrams: number;
  proteinCalories: number;
  carbohydratesCalories: number;
  fatsCalories: number;
  totalCalories: number;
  proteinPercent: number;
  carbohydratesPercent: number;
  fatsPercent: number;
};

export function calculateMacroDistribution(input: { protein: number; carbohydrates: number; fats: number }): MacroDistribution {
  const proteinGrams = Math.max(0, Number(input.protein) || 0);
  const carbohydratesGrams = Math.max(0, Number(input.carbohydrates) || 0);
  const fatsGrams = Math.max(0, Number(input.fats) || 0);
  const proteinCalories = proteinGrams * 4;
  const carbohydratesCalories = carbohydratesGrams * 4;
  const fatsCalories = fatsGrams * 9;
  const totalCalories = proteinCalories + carbohydratesCalories + fatsCalories;
  const percent = (value: number) => totalCalories > 0 ? Math.round((value / totalCalories) * 100) : 0;
  return {
    proteinGrams,
    carbohydratesGrams,
    fatsGrams,
    proteinCalories,
    carbohydratesCalories,
    fatsCalories,
    totalCalories,
    proteinPercent: percent(proteinCalories),
    carbohydratesPercent: percent(carbohydratesCalories),
    fatsPercent: percent(fatsCalories),
  };
}
