import { supabase } from './supabase';

// ─── DATE HELPERS ────────────────────────────────────────────

/**
 * Returns YYYY-MM-DD format for a Date object.
 */
export function toIsoDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Suggest a sensible default shop date — the next Friday from today.
 * (User can override in the calendar prompt.)
 */
export function suggestNextShopDate(now = new Date()) {
  const day = now.getDay();              // 0=Sun, 5=Fri, 6=Sat
  // Days forward to next Friday (today if today is Friday)
  const daysForward = (5 - day + 7) % 7;
  const fri = new Date(now);
  fri.setDate(now.getDate() + daysForward);
  fri.setHours(0, 0, 0, 0);
  return fri;
}

/**
 * Format a YYYY-MM-DD shop date as e.g. "Fri 1 May".
 * Treats the date as a local-calendar date (no timezone shifts).
 */
export function formatShopDate(shopDateStr) {
  if (!shopDateStr) return '';
  const [y, m, d] = shopDateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

// ─── DAY ORDERING (anchored to shop_date) ────────────────────

const ALL_DAYS = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];

/**
 * Returns the 7 day keys in order, starting from the day of the shop date.
 * E.g. shop date is Tuesday → ['tuesday','wednesday','thursday','friday','saturday','sunday','monday']
 */
export function getDayOrder(shopDateStr) {
  if (!shopDateStr) return ['friday','saturday','sunday','monday','tuesday','wednesday','thursday'];
  const [y, m, d] = shopDateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const startIdx = dt.getDay();
  const order = [];
  for (let i = 0; i < 7; i++) {
    order.push(ALL_DAYS[(startIdx + i) % 7]);
  }
  return order;
}

// ─── PLAN GENERATION ─────────────────────────────────────────
// Build a 7-day plan starting from the shop date (which anchors day 1),
// using the same rules as before:
//   - Friday: meat-free meals only
//   - Saturday: any weekend meal except Sunday-only ones
//   - Sunday: a roast (sundayOnly meal) or a weekend meal
//   - Mon-Thu: weeknight meals
//   - If Roast Chicken on Sunday, place Chicken Fried Rice on Mon or Tue
//   - No repeats within a single week

export function suggestPlan(meals, shopDateStr) {
  const used = new Set();
  const plan = {};
  const days = getDayOrder(shopDateStr);

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

  // For each day in the plan, pick from the right pool
  for (const day of days) {
    if (day === 'friday') {
      plan.friday = pick(friday);
    } else if (day === 'sunday') {
      const sundayAvailable = sundayOnly.filter(([id]) => !used.has(id));
      if (sundayAvailable.length > 0) {
        const choice = sundayAvailable[Math.floor(Math.random() * sundayAvailable.length)];
        plan.sunday = choice[0];
        used.add(choice[0]);
      } else {
        plan.sunday = pick(weekend);
      }
    } else if (day === 'saturday') {
      plan.saturday = pick(weekend);
    } else {
      plan[day] = pick(weeknight);
    }
  }

  // Roast chicken → fried rice spawn (next available weeknight slot in plan order)
  if (plan.sunday === 'roast_chicken' && meals.chicken_fried_rice) {
    // Find the position of Sunday in the day order and place Fried Rice 1-2 days later
    const sundayIdx = days.indexOf('sunday');
    const monIdx = days.indexOf('monday');
    const tueIdx = days.indexOf('tuesday');
    // Prefer placing it on the soonest weeknight after Sunday in plan order
    const candidates = [monIdx, tueIdx].filter(i => i > sundayIdx).sort((a,b) => a-b);
    const targetDay = candidates.length > 0 ? days[candidates[0]] : 'monday';
    plan[targetDay] = 'chicken_fried_rice';
    used.add('chicken_fried_rice');
  }

  return plan;
}

// ─── PERSISTENCE ─────────────────────────────────────────────

/**
 * Get the current household's active week plan (the most recent
 * non-archived plan). Returns null if none exists.
 */
export async function getActiveWeekPlan(householdId) {
  const { data, error } = await supabase
    .from('week_plans')
    .select('*')
    .eq('household_id', householdId)
    .neq('stage', 'archived')
    .order('shop_date', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Start a new shop cycle. Archives the existing active plan (if any)
 * and creates a fresh one with the given shop_date.
 */
export async function startNewShop(householdId, shopDateStr, meals) {
  // Archive existing active plan (if any)
  await supabase
    .from('week_plans')
    .update({ stage: 'archived' })
    .eq('household_id', householdId)
    .neq('stage', 'archived');

  // Generate plan and create the new one
  const newPlan = suggestPlan(meals, shopDateStr);
  const { data: { user } } = await supabase.auth.getUser();

  const { data: created, error } = await supabase
    .from('week_plans')
    .insert({
      household_id: householdId,
      week_id: shopDateStr,    // for back-compat
      shop_date: shopDateStr,
      plan: newPlan,
      prompts: {},
      stage: 'planning',
      created_by: user?.id,
    })
    .select()
    .single();

  if (error) throw error;
  return created;
}

/**
 * Reset (clear) the current active plan without changing the shop_date.
 * Same as startNewShop but reuses the existing row.
 */
export async function resetActivePlan(weekPlanId, meals, shopDateStr) {
  // Delete shopping items for this plan
  await supabase.from('shopping_items').delete().eq('week_plan_id', weekPlanId);
  // Generate fresh plan
  const newPlan = suggestPlan(meals, shopDateStr);
  const { error } = await supabase
    .from('week_plans')
    .update({ plan: newPlan, prompts: {}, stage: 'planning' })
    .eq('id', weekPlanId);
  if (error) throw error;
}

export async function updatePlan(weekPlanId, plan) {
  const { error } = await supabase
    .from('week_plans')
    .update({ plan })
    .eq('id', weekPlanId);
  if (error) throw error;
}

/**
 * Refresh the planning stage: regenerate meal suggestions but keep the same
 * shop_date and stage. Doesn't touch prompts or shopping items (there
 * shouldn't be any yet at this stage).
 */
export async function refreshPlanStage(weekPlanId, meals, shopDateStr) {
  const newPlan = suggestPlan(meals, shopDateStr);
  // Also clear prompts and items in case the user came back to plan stage
  await supabase.from('shopping_items').delete().eq('week_plan_id', weekPlanId);
  const { error } = await supabase
    .from('week_plans')
    .update({ plan: newPlan, prompts: {} })
    .eq('id', weekPlanId);
  if (error) throw error;
}

/**
 * Refresh the review stage: clear prompt answers and shopping items, but
 * keep the meal plan. The user re-answers prompts; items rebuild from there.
 */
export async function refreshReviewStage(weekPlanId) {
  await supabase.from('shopping_items').delete().eq('week_plan_id', weekPlanId);
  const { error } = await supabase
    .from('week_plans')
    .update({ prompts: {} })
    .eq('id', weekPlanId);
  if (error) throw error;
}

/**
 * Refresh the shop stage: reset all item statuses back to pending, but keep
 * the items themselves (and any qty edits).
 */
export async function refreshShopStage(weekPlanId) {
  const { error } = await supabase
    .from('shopping_items')
    .update({
      status: 'pending',
      status_updated_at: null,
      status_updated_by: null,
    })
    .eq('week_plan_id', weekPlanId);
  if (error) throw error;
}

export function subscribeToWeekPlan(weekPlanId, onUpdate) {
  const channelName = `week_plan_${weekPlanId}_${Math.random().toString(36).slice(2, 8)}`;
  const channel = supabase
    .channel(channelName)
    .on('postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'week_plans',
        filter: `id=eq.${weekPlanId}` },
      (payload) => onUpdate(payload.new)
    )
    .subscribe();
  return () => supabase.removeChannel(channel);
}
