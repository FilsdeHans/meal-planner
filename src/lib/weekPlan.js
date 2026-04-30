import { supabase } from './supabase';

// ─── WEEK ID HELPERS ──────────────────────────────────────────
// The shopping week runs Friday → Thursday. The "week ID" is the date of
// the Friday that anchors that week, in YYYY-MM-DD format.

export function getShoppingWeekFriday(now = new Date()) {
  const day = now.getDay();              // 0=Sun, 1=Mon, ..., 5=Fri, 6=Sat
  const daysBack = (day - 5 + 7) % 7;    // distance back to most recent Friday
  const fri = new Date(now);
  fri.setDate(now.getDate() - daysBack);
  fri.setHours(0, 0, 0, 0);
  return fri;
}

export function getWeekId(now = new Date()) {
  const fri = getShoppingWeekFriday(now);
  const y = fri.getFullYear();
  const m = String(fri.getMonth() + 1).padStart(2, '0');
  const d = String(fri.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getWeekLabel(now = new Date()) {
  const fri = getShoppingWeekFriday(now);
  return `w/c ${fri.getDate()} ${fri.toLocaleString("en-GB", { month: "short" })}`;
}

// ─── PLAN GENERATION ─────────────────────────────────────────
// Build a 7-day plan (Friday → Thursday) using the rules:
//   - Friday: meat-free meals only
//   - Saturday: any weekend meal except Sunday-only ones
//   - Sunday: a roast (sundayOnly meal) or a weekend meal
//   - Monday-Thursday: weeknight meals
//   - If Roast Chicken on Sunday, place Chicken Fried Rice on Monday or Tuesday
//   - No repeats within a single week

export function suggestPlan(meals) {
  const used = new Set();
  const plan = {};

  const pick = (pool) => {
    const avail = pool.filter(([id]) => !used.has(id));
    const choice = avail[Math.floor(Math.random() * avail.length)] || pool[0];
    if (choice) used.add(choice[0]);
    return choice ? choice[0] : null;
  };

  const entries = Object.entries(meals);
  const weeknight  = entries.filter(([,m]) => !m.fri && !m.weekend && !m.leftoverOf && !m.eatOut);
  const weekend    = entries.filter(([,m]) => m.weekend && !m.sundayOnly && !m.eatOut);
  const sundayOnly = entries.filter(([,m]) => m.sundayOnly && !m.eatOut);
  const friday     = entries.filter(([,m]) => m.fri && !m.eatOut);

  plan.friday    = pick(friday);
  plan.saturday  = pick(weekend);

  // Sunday — prefer a Sunday-only meal if any are still unused
  const sundayAvailable = sundayOnly.filter(([id]) => !used.has(id));
  if (sundayAvailable.length > 0) {
    const choice = sundayAvailable[Math.floor(Math.random() * sundayAvailable.length)];
    plan.sunday = choice[0];
    used.add(choice[0]);
  } else {
    plan.sunday = pick(weekend);
  }

  plan.monday    = pick(weeknight);
  plan.tuesday   = pick(weeknight);
  plan.wednesday = pick(weeknight);
  plan.thursday  = pick(weeknight);

  // Roast chicken → fried rice spawn
  if (plan.sunday === 'roast_chicken' && meals.chicken_fried_rice) {
    const slot = Math.random() > 0.5 ? 'monday' : 'tuesday';
    plan[slot] = 'chicken_fried_rice';
    used.add('chicken_fried_rice');
  }

  return plan;
}

// ─── PLAN PERSISTENCE ────────────────────────────────────────

/**
 * Get or create the week plan for a given household + week.
 * Returns the row from week_plans.
 */
export async function getOrCreateWeekPlan(householdId, weekId, meals) {
  // Try to load existing
  const { data: existing, error: loadErr } = await supabase
    .from('week_plans')
    .select('*')
    .eq('household_id', householdId)
    .eq('week_id', weekId)
    .maybeSingle();

  if (loadErr) throw loadErr;
  if (existing) return existing;

  // Doesn't exist — generate and insert
  const newPlan = suggestPlan(meals);
  const { data: { user } } = await supabase.auth.getUser();

  const { data: created, error: createErr } = await supabase
    .from('week_plans')
    .insert({
      household_id: householdId,
      week_id: weekId,
      plan: newPlan,
      prompts: {},
      stage: 'planning',
      created_by: user?.id,
    })
    .select()
    .single();

  if (createErr) throw createErr;
  return created;
}

/**
 * Update the plan column for an existing week plan.
 */
export async function updatePlan(weekPlanId, plan) {
  const { error } = await supabase
    .from('week_plans')
    .update({ plan })
    .eq('id', weekPlanId);
  if (error) throw error;
}

/**
 * Reset the current week — clears the plan, prompts, items and stage.
 * Generates a fresh suggested plan.
 */
export async function resetWeek(weekPlanId, meals) {
  // Delete all shopping items for this week
  const { error: delErr } = await supabase
    .from('shopping_items')
    .delete()
    .eq('week_plan_id', weekPlanId);
  if (delErr) throw delErr;

  // Generate fresh plan
  const newPlan = suggestPlan(meals);

  // Reset the week plan
  const { error: updErr } = await supabase
    .from('week_plans')
    .update({
      plan: newPlan,
      prompts: {},
      stage: 'planning',
    })
    .eq('id', weekPlanId);
  if (updErr) throw updErr;
}

/**
 * Subscribe to real-time changes on a specific week plan.
 * onUpdate gets called with the updated row whenever it changes.
 * Returns a cleanup function.
 */
export function subscribeToWeekPlan(weekPlanId, onUpdate) {
  // Unique channel name so React strict-mode double-invocation doesn't
  // try to re-subscribe to the same channel
  const channelName = `week_plan_${weekPlanId}_${Math.random().toString(36).slice(2, 8)}`;
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'week_plans',
        filter: `id=eq.${weekPlanId}`,
      },
      (payload) => onUpdate(payload.new)
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}
