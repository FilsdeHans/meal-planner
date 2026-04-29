import { supabase } from './supabase';

/**
 * Fetches all meals available to the current household, with their
 * linked ingredients. Returns meals in the shape the app needs:
 *
 *   {
 *     spag_bol: {
 *       name: "Spag Bol",
 *       fri: false,
 *       weekend: false,
 *       sundayOnly: false,
 *       eatOut: false,
 *       texMex: false,
 *       indian: false,
 *       chinese: false,
 *       seasonalMonths: null,    // or e.g. [9,10,11,12,1,2,3]
 *       chipsPrompt: false,
 *       peaPrompt: false,
 *       roastPrompt: false,
 *       ribPrompt: false,
 *       leftoverOf: null,
 *       leftoverIngredient: null,
 *       spawns: null,
 *       ingredients: ["beef_mince", "spaghetti", ...],
 *     },
 *     ...
 *   }
 */
export async function fetchMeals() {
  // Pull all meals (RLS automatically filters to global + household-specific)
  const { data: meals, error: mealsError } = await supabase
    .from('meals')
    .select('*');
  if (mealsError) throw mealsError;

  // Pull all meal-ingredient links for those meals
  const { data: links, error: linksError } = await supabase
    .from('meal_ingredients')
    .select('meal_key, ingredient_key');
  if (linksError) throw linksError;

  // Group ingredients by meal_key
  const ingredientsByMeal = {};
  for (const link of links) {
    if (!ingredientsByMeal[link.meal_key]) ingredientsByMeal[link.meal_key] = [];
    ingredientsByMeal[link.meal_key].push(link.ingredient_key);
  }

  // Reshape into the object keyed by meal_key
  const result = {};
  for (const m of meals) {
    result[m.meal_key] = {
      name: m.name,
      fri: m.is_friday_safe,
      weekend: m.is_weekend,
      sundayOnly: m.is_sunday_only,
      eatOut: m.is_eat_out,
      texMex: m.is_tex_mex,
      indian: m.is_indian,
      chinese: m.is_chinese,
      seasonalMonths: m.seasonal_months,
      chipsPrompt: m.needs_chips_prompt,
      peaPrompt: m.needs_pea_prompt,
      roastPrompt: m.needs_roast_prompt,
      ribPrompt: m.needs_rib_prompt,
      leftoverOf: m.leftover_of,
      leftoverIngredient: m.leftover_ingredient,
      spawns: m.spawns,
      ingredients: ingredientsByMeal[m.meal_key] || [],
    };
  }
  return result;
}

/**
 * Fetches all ingredients available to the current household.
 * Returns object keyed by ingredient_key, like the old INGREDIENTS const.
 */
export async function fetchIngredients() {
  const { data, error } = await supabase
    .from('ingredients')
    .select('*');
  if (error) throw error;

  const result = {};
  for (const ing of data) {
    result[ing.ingredient_key] = {
      name: ing.name,
      aisle: ing.aisle,
    };
  }
  return result;
}
