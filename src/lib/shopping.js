import { supabase } from './supabase';

// ─── HARDCODED STAPLES (Stage 4 will migrate to household_staples) ───
export const WEEKLY_STAPLES = [
  "seeded_loaf","white_loaf","garlic_bread","cheese","sliced_ham","sliced_chicken",
  "yoghurt","biscuits","crackers","apples","salad_bag","onions","garlic",
  "shower_gel","norpak_lighter","peppers","cucumber","bananas","blueberries",
  "strawberries","raspberries","crisps",
];

export const TEX_MEX_DEFAULTS = ["tortillas","guacamole","salsa","sour_cream"];

// type can be "yesno" or "select"
export const HOUSEHOLD_PROMPTS = [
  { id:"toilet_rolls",        label:"Toilet rolls",        type:"yesno",  adds:["toilet_rolls"] },
  { id:"kitchen_roll",        label:"Kitchen roll",        type:"yesno",  adds:["kitchen_roll"] },
  { id:"shampoo",             label:"Shampoo",             type:"yesno",  adds:["shampoo"] },
  { id:"deodorant",           label:"Deodorant",           type:"select",
    options:[
      { label:"Male",   adds:["deodorant_male"] },
      { label:"Female", adds:["deodorant_female"] },
      { label:"Both",   adds:["deodorant_male","deodorant_female"] },
    ]},
  { id:"hairspray",           label:"Hairspray",           type:"yesno",  adds:["hairspray"] },
  { id:"candle",              label:"Candle",              type:"yesno",  adds:["candle"] },
  { id:"fabric_conditioner",  label:"Fabric conditioner",  type:"yesno",  adds:["fabric_conditioner"] },
  { id:"sanitary_pads",       label:"Sanitary pads",       type:"select",
    options:[
      { label:"Green",  adds:["sanitary_green"] },
      { label:"Purple", adds:["sanitary_purple"] },
      { label:"Both",   adds:["sanitary_green","sanitary_purple"] },
    ]},
  { id:"washing_tablets",     label:"Washing tablets",     type:"yesno",  adds:["washing_tablets"] },
  { id:"scourers",            label:"Scourers",            type:"yesno",  adds:["scourers"] },
  { id:"washing_up_liquid",   label:"Washing up liquid",   type:"yesno",  adds:["washing_up_liquid"] },
  { id:"bin_bags",            label:"Bin bags",            type:"yesno",  adds:["bin_bags"] },
  { id:"sandwich_bags",       label:"Sandwich bags",       type:"yesno",  adds:["sandwich_bags"] },
  { id:"lemonade",            label:"Lemonade",            type:"yesno",  adds:["lemonade"] },
  { id:"orange_squash",       label:"Orange squash",       type:"yesno",  adds:["orange_squash"] },
  { id:"blackcurrant_squash", label:"Blackcurrant squash", type:"yesno",  adds:["blackcurrant_squash"] },
  { id:"ice_cream",           label:"Ice cream",           type:"yesno",  adds:["ice_cream"] },
  { id:"ice_lollies",         label:"Ice lollies",         type:"yesno",  adds:["ice_lollies"] },
  { id:"tea",                 label:"Tea",                 type:"yesno",  adds:["tea"] },
  { id:"coffee",              label:"Coffee",              type:"yesno",  adds:["coffee"] },
];

// ─── BUILD SHOPPING LIST FROM PLAN + PROMPTS ─────────────────
/**
 * Returns an array of items derived from the plan and prompt answers.
 * Each item has: { ingredient_key, display_name, aisle, source, source_meal_key }
 */
export function buildShoppingItems(plan, prompts, meals, ingredients) {
  const seen = new Map(); // ingredient_key -> item object

  const add = (ingKey, source, sourceMealKey = null) => {
    const ing = ingredients[ingKey];
    if (!ing || seen.has(ingKey)) return;
    seen.set(ingKey, {
      ingredient_key: ingKey,
      display_name: ing.name,
      aisle: ing.aisle,
      source,
      source_meal_key: sourceMealKey,
    });
  };

  // Weekly staples
  WEEKLY_STAPLES.forEach(k => add(k, 'staple'));

  // Each meal in the plan
  Object.values(plan).forEach(mealKey => {
    const meal = meals[mealKey];
    if (!meal || meal.eatOut) return;

    // Skip leftover ingredient if parent meal is also in plan
    const skipIngredient = (meal.leftoverOf && Object.values(plan).includes(meal.leftoverOf))
      ? meal.leftoverIngredient : null;

    meal.ingredients.forEach(ingKey => {
      if (ingKey !== skipIngredient) add(ingKey, 'meal', mealKey);
    });

    // Tex-Mex defaults
    if (meal.texMex) {
      TEX_MEX_DEFAULTS.forEach(k => add(k, 'tex_mex', mealKey));
      // Plus optional nachos side
      if (prompts[`nachos_${mealKey}`] === 'yes') {
        add('nachos_shells', 'tex_mex', mealKey);
        add('jalapenos', 'tex_mex', mealKey);
      }
    }
    // Indian sides
    if (meal.indian) {
      add('samosas', 'indian_side', mealKey);
      add('onion_bhajis', 'indian_side', mealKey);
    }
    // Chinese sides
    if (meal.chinese) {
      add('prawn_crackers', 'chinese_side', mealKey);
    }

    // Chips/wedges prompt
    if (meal.chipsPrompt) {
      const ans = prompts[`chips_${mealKey}`];
      add(ans === 'wedges' ? 'potatoes' : 'chips', 'meal', mealKey);
    }
    // Peas prompt
    if (meal.peaPrompt) {
      const ans = prompts[`peas_${mealKey}`];
      add(ans === 'marrowfat' ? 'marrowfat_peas' : 'frozen_peas', 'meal', mealKey);
    }
    // Roast meat
    if (meal.roastPrompt) {
      const meat = prompts[`roast_${mealKey}`];
      const map = { Chicken:'whole_chicken', Beef:'beef_joint', Pork:'pork_joint', Lamb:'leg_of_lamb' };
      add(map[meat] || 'whole_chicken', 'meal', mealKey);
    }
  });

  // Household prompt answers
  Object.entries(prompts).forEach(([key, val]) => {
    if (!key.startsWith('household_')) return;
    const hId = key.replace('household_','');
    const h = HOUSEHOLD_PROMPTS.find(x => x.id === hId);
    if (!h || val === 'no' || val === 'skip') return;
    if (h.type === 'yesno' && val === 'yes') h.adds.forEach(k => add(k, 'household_prompt'));
    if (h.type === 'select') {
      const opt = h.options.find(o => o.label === val);
      if (opt) opt.adds.forEach(k => add(k, 'household_prompt'));
    }
  });

  return Array.from(seen.values());
}

// ─── PERSISTENCE ──────────────────────────────────────────────

/**
 * Sync the shopping_items table to match the desired item list.
 * Adds new items, removes ones no longer needed.
 * Preserves status, qty, etc. on items that remain.
 */
export async function syncShoppingItems(weekPlanId, householdId, desiredItems) {
  const { data: existing, error: existingErr } = await supabase
    .from('shopping_items')
    .select('*')
    .eq('week_plan_id', weekPlanId);
  if (existingErr) throw existingErr;

  const existingByKey = new Map();
  for (const item of existing) {
    // Use composite key: ingredient_key + source (so meal-derived staple ≠ household-prompted)
    // Actually simpler: just key on ingredient_key (each ingredient appears once per list)
    if (item.ingredient_key) existingByKey.set(item.ingredient_key, item);
  }

  const desiredKeys = new Set(desiredItems.map(i => i.ingredient_key));

  // Delete items that are no longer wanted (only system-sourced ones; preserve manual)
  const toDelete = existing.filter(i =>
    i.ingredient_key &&
    !desiredKeys.has(i.ingredient_key) &&
    i.source !== 'manual'
  );
  if (toDelete.length > 0) {
    const { error } = await supabase
      .from('shopping_items')
      .delete()
      .in('id', toDelete.map(i => i.id));
    if (error) throw error;
  }

  // Insert items that are missing
  const { data: { user } } = await supabase.auth.getUser();
  const toInsert = desiredItems
    .filter(i => !existingByKey.has(i.ingredient_key))
    .map(i => ({
      week_plan_id: weekPlanId,
      household_id: householdId,
      ingredient_key: i.ingredient_key,
      display_name: i.display_name,
      aisle: i.aisle,
      source: i.source,
      source_meal_key: i.source_meal_key,
      added_by: user?.id,
    }));

  if (toInsert.length > 0) {
    const { error } = await supabase
      .from('shopping_items')
      .insert(toInsert);
    if (error) throw error;
  }
}

export async function fetchShoppingItems(weekPlanId) {
  const { data, error } = await supabase
    .from('shopping_items')
    .select('*')
    .eq('week_plan_id', weekPlanId)
    .order('added_at', { ascending: true });
  if (error) throw error;
  return data;
}

export async function updateItemQty(itemId, qty, unit) {
  const { error } = await supabase
    .from('shopping_items')
    .update({ qty, unit, is_modified: true })
    .eq('id', itemId);
  if (error) throw error;
}

export async function updateItemStatus(itemId, status) {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase
    .from('shopping_items')
    .update({
      status,
      status_updated_by: user?.id,
      status_updated_at: new Date().toISOString(),
    })
    .eq('id', itemId);
  if (error) throw error;
}

export async function deleteItem(itemId) {
  const { error } = await supabase
    .from('shopping_items')
    .delete()
    .eq('id', itemId);
  if (error) throw error;
}

export async function addManualItem(weekPlanId, householdId, name, aisle = 'extras') {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('shopping_items')
    .insert({
      week_plan_id: weekPlanId,
      household_id: householdId,
      display_name: name,
      aisle,
      source: 'manual',
      added_by: user?.id,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateWeekPlanStage(weekPlanId, stage) {
  const { error } = await supabase
    .from('week_plans')
    .update({ stage })
    .eq('id', weekPlanId);
  if (error) throw error;
}

export async function updateWeekPlanPrompts(weekPlanId, prompts) {
  const { error } = await supabase
    .from('week_plans')
    .update({ prompts })
    .eq('id', weekPlanId);
  if (error) throw error;
}

export function subscribeToShoppingItems(weekPlanId, onChange) {
  const channelName = `shopping_${weekPlanId}_${Math.random().toString(36).slice(2, 8)}`;
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'shopping_items',
        filter: `week_plan_id=eq.${weekPlanId}` },
      onChange
    )
    .subscribe();
  return () => supabase.removeChannel(channel);
}

// ─── AISLE ORDER ─────────────────────────────────────────────
export const AISLES = [
  { id:"fruit_veg",     label:"🥬 Fruit & Salad Veg" },
  { id:"rice_pasta",    label:"🍝 Rice & Pasta" },
  { id:"meat",          label:"🥩 Meat" },
  { id:"chilled",       label:"🧀 Chilled" },
  { id:"confectionery", label:"🍬 Confectionery" },
  { id:"canned",        label:"🥫 Canned Goods" },
  { id:"root_veg",      label:"🧅 Root Veg & Peppers" },
  { id:"crisps",        label:"🥔 Crisps & Snacks" },
  { id:"soft_drinks",   label:"🥤 Soft Drinks" },
  { id:"toiletries",    label:"🧴 Toiletries" },
  { id:"cleaning",      label:"🧹 Cleaning" },
  { id:"frozen",        label:"❄️ Frozen" },
  { id:"bread",         label:"🍞 Bread" },
  { id:"tea_coffee",    label:"☕ Tea & Coffee" },
  { id:"misc",          label:"📦 Misc" },
  { id:"extras",        label:"➕ Added Items" },
];
