import { useEffect, useState } from 'react';
import { onAuthChange, getCurrentUser, signOut } from './lib/auth';
import { supabase } from './lib/supabase';
import { fetchMeals, fetchIngredients } from './lib/meals';
import {
  getActiveWeekPlan, startNewShop, resetActivePlan,
  subscribeToWeekPlan, formatShopDate,
} from './lib/weekPlan';
import {
  buildShoppingItems, syncShoppingItems, fetchShoppingItems,
  subscribeToShoppingItems, updateWeekPlanStage,
} from './lib/shopping';
import SignIn from './components/SignIn';
import PlanView from './components/PlanView';
import ReviewView from './components/ReviewView';
import ShopView from './components/ShopView';
import NewShopModal from './components/NewShopModal';

const C = {
  forest:"#2c4a2e", sage:"#c8d9a0", sageLt:"#eef4e4",
  cream:"#faf7f2", warm:"#f5f0e8", ink:"#1e1e1e", mid:"#6b6157",
};

export default function App() {
  const [user, setUser]                   = useState(null);
  const [authLoading, setAuthLoading]     = useState(true);
  const [householdId, setHouseholdId]     = useState(null);
  const [householdName, setHouseholdName] = useState(null);
  const [meals, setMeals]                 = useState({});
  const [ingredients, setIngredients]     = useState({});
  const [weekPlan, setWeekPlan]           = useState(null);
  const [items, setItems]                 = useState([]);
  const [dataLoading, setDataLoading]     = useState(false);
  const [error, setError]                 = useState(null);
  const [newShopOpen, setNewShopOpen]     = useState(false);

  useEffect(() => {
    getCurrentUser().then(u => { setUser(u); setAuthLoading(false); });
    const sub = onAuthChange(u => { setUser(u); setAuthLoading(false); });
    return () => sub.unsubscribe();
  }, []);

  // Load household + meals
  useEffect(() => {
    if (!user) return;
    setDataLoading(true);
    setError(null);
    (async () => {
      try {
        const { data: members, error: membersErr } = await supabase
          .from('household_members')
          .select('household_id, households(name)');
        if (membersErr) throw membersErr;
        if (!members?.[0]) {
          setError("You're signed in but not yet linked to a household.");
          setDataLoading(false);
          return;
        }
        setHouseholdId(members[0].household_id);
        setHouseholdName(members[0].households?.name);

        const [m, ing] = await Promise.all([fetchMeals(), fetchIngredients()]);
        setMeals(m);
        setIngredients(ing);

        const active = await getActiveWeekPlan(members[0].household_id);
        setWeekPlan(active);

        if (active) {
          const initialItems = await fetchShoppingItems(active.id);
          setItems(initialItems);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setDataLoading(false);
      }
    })();
  }, [user]);

  // Real-time + helper functions, scoped to current weekPlan
  useEffect(() => {
    if (!weekPlan) return;
    const cleanupPlan = subscribeToWeekPlan(weekPlan.id, (updated) => setWeekPlan(updated));

    window.__refreshItems = async () => {
      const refreshed = await fetchShoppingItems(weekPlan.id);
      setItems(refreshed);
    };

    window.__syncItems = async () => {
      const { data: latest } = await supabase
        .from('week_plans')
        .select('plan, prompts')
        .eq('id', weekPlan.id)
        .single();
      if (latest) {
        const desired = buildShoppingItems(
          latest.plan || {}, latest.prompts || {}, meals, ingredients
        );
        await syncShoppingItems(weekPlan.id, householdId, desired);
        const refreshed = await fetchShoppingItems(weekPlan.id);
        setItems(refreshed);
      }
    };

    const cleanupItems = subscribeToShoppingItems(weekPlan.id, async () => {
      const refreshed = await fetchShoppingItems(weekPlan.id);
      setItems(refreshed);
    });

    return () => { cleanupPlan(); cleanupItems(); };
  }, [weekPlan?.id, meals, ingredients, householdId]);

  // Sync items when in review/shopping stage
  useEffect(() => {
    if (!weekPlan || !householdId) return;
    if (weekPlan.stage !== 'reviewing' && weekPlan.stage !== 'shopping') return;
    if (Object.keys(meals).length === 0 || Object.keys(ingredients).length === 0) return;

    const desired = buildShoppingItems(weekPlan.plan || {}, weekPlan.prompts || {}, meals, ingredients);
    syncShoppingItems(weekPlan.id, householdId, desired)
      .then(async () => {
        const refreshed = await fetchShoppingItems(weekPlan.id);
        setItems(refreshed);
      })
      .catch(e => console.error('Sync items failed:', e));
  }, [weekPlan?.id, weekPlan?.stage, JSON.stringify(weekPlan?.plan), JSON.stringify(weekPlan?.prompts), Object.keys(meals).length, Object.keys(ingredients).length, householdId]);

  const advanceTo = async (stage) => {
    try {
      await updateWeekPlanStage(weekPlan.id, stage);
      setWeekPlan(prev => ({ ...prev, stage }));
    } catch (e) {
      alert('Failed to advance: ' + e.message);
    }
  };

  const handleStartNewShop = async (shopDate) => {
    setNewShopOpen(false);
    try {
      const created = await startNewShop(householdId, shopDate, meals);
      setItems([]);
      setWeekPlan(created);
    } catch (e) {
      alert('Failed to start new shop: ' + e.message);
    }
  };

  if (authLoading) {
    return (
      <div style={{ fontFamily:"'Lato',sans-serif", background:C.cream, minHeight:"100vh",
        display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ color:C.mid }}>Loading…</div>
      </div>
    );
  }

  if (!user) return <SignIn />;

  const stages = [
    { id:"planning",  label:"Plan" },
    { id:"reviewing", label:"Review" },
    { id:"shopping",  label:"Shop" },
  ];
  const stageIdx = stages.findIndex(s => s.id === weekPlan?.stage);
  const currentStage = weekPlan?.stage || 'planning';

  return (
    <div style={{ fontFamily:"'Lato',sans-serif", background:C.cream, minHeight:"100vh",
      paddingBottom:40 }}>
      <div style={{ background:C.forest, padding:"18px 20px",
        boxShadow:"0 2px 12px rgba(0,0,0,0.15)" }}>
        <div style={{ maxWidth:430, margin:"0 auto" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start",
            marginBottom: weekPlan ? 14 : 0 }}>
            <div>
              <div style={{ color:C.sage, fontSize:10, letterSpacing:3,
                textTransform:"uppercase" }}>{householdName || "—"}</div>
              <div style={{ color:"#fff", fontSize:20, fontWeight:700,
                fontFamily:"'Playfair Display',serif" }}>Meal Planner</div>
            </div>
            <div style={{ textAlign:"right" }}>
              {weekPlan && (
                <div style={{ color:C.sage, fontSize:11 }}>
                  Shopping {formatShopDate(weekPlan.shop_date)}
                </div>
              )}
              <div style={{ display:"flex", gap:6, marginTop:4, justifyContent:"flex-end" }}>
                {weekPlan && (
                  <button onClick={() => setNewShopOpen(true)} title="Start a new shop"
                    style={{ background:"rgba(255,255,255,0.1)", border:"none", color:C.sage,
                      padding:"4px 10px", borderRadius:6, fontSize:11, cursor:"pointer" }}>
                    ↻ New shop
                  </button>
                )}
                <button onClick={signOut} style={{ background:"rgba(255,255,255,0.1)",
                  border:"none", color:C.sage, padding:"4px 10px", borderRadius:6, fontSize:11,
                  cursor:"pointer" }}>Sign out</button>
              </div>
            </div>
          </div>
          {weekPlan && (
            <div style={{ display:"flex", alignItems:"center", gap:0 }}>
              {stages.map((st, i) => {
                const active = st.id === currentStage;
                const done = i < stageIdx;
                return (
                  <div key={st.id} style={{ display:"flex", alignItems:"center", flex:1 }}>
                    <div onClick={() => done && advanceTo(st.id)} style={{ flex:1, textAlign:"center",
                      padding:"6px 0", borderRadius:20,
                      background: active ? C.sage : done ? "rgba(200,217,160,0.3)" : "rgba(255,255,255,0.1)",
                      color: active ? C.forest : done ? C.sage : "rgba(255,255,255,0.4)",
                      fontSize:11, fontWeight: active ? 700 : 400,
                      cursor: done ? "pointer" : "default", transition:"all 0.2s" }}>
                      {done ? "✓ " : ""}{st.label}
                    </div>
                    {i < stages.length - 1 && (
                      <div style={{ width:16, height:1, background:"rgba(255,255,255,0.2)",
                        flexShrink:0 }} />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div style={{ maxWidth:430, margin:"0 auto", padding:"16px" }}>
        {error && (
          <div style={{ background:"#fff8f8", border:"1px solid #f5c0c0", borderRadius:12,
            padding:"12px 14px", marginBottom:14, fontSize:13, color:"#c0392b" }}>
            {error}
          </div>
        )}

        {dataLoading && (
          <div style={{ padding:"40px 20px", textAlign:"center", color:C.mid, fontSize:13 }}>
            Loading…
          </div>
        )}

        {/* Empty state — no active plan */}
        {!dataLoading && !weekPlan && !error && (
          <div style={{ padding:"60px 20px", textAlign:"center" }}>
            <div style={{ fontSize:48, marginBottom:14 }}>🛒</div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:700,
              color:C.ink, marginBottom:8 }}>No shop in progress</div>
            <div style={{ fontSize:13, color:C.mid, marginBottom:24, lineHeight:1.5 }}>
              Start a new shop when you're ready to plan the week's meals.
            </div>
            <button onClick={() => setNewShopOpen(true)} style={{ background:C.forest,
              color:"#fff", border:"none", borderRadius:50, padding:"15px 32px", fontSize:14,
              fontWeight:700, cursor:"pointer",
              boxShadow:"0 4px 20px rgba(44,74,46,0.4)" }}>
              Start a new shop ✨
            </button>
          </div>
        )}

        {!dataLoading && weekPlan && currentStage === 'planning' && (
          <>
            <PlanView weekPlan={weekPlan} meals={meals}
              onPlanUpdate={plan => setWeekPlan(prev => ({ ...prev, plan }))} />
            <div style={{ height:80 }} />
            <button onClick={() => advanceTo('reviewing')} style={{ position:"fixed",
              bottom:24, left:"50%", transform:"translateX(-50%)",
              background:C.forest, color:"#fff", border:"none", borderRadius:50,
              padding:"15px 32px", fontSize:14, fontWeight:700, cursor:"pointer",
              boxShadow:"0 4px 20px rgba(44,74,46,0.4)", zIndex:50, whiteSpace:"nowrap" }}>
              Review & Build List →
            </button>
          </>
        )}

        {!dataLoading && weekPlan && currentStage === 'reviewing' && (
          <ReviewView weekPlan={weekPlan} meals={meals} items={items}
            householdId={householdId}
            onAdvance={() => advanceTo('shopping')}
            refreshItems={window.__refreshItems}
            syncItems={window.__syncItems} />
        )}

        {!dataLoading && weekPlan && currentStage === 'shopping' && (
          <ShopView items={items} refreshItems={window.__refreshItems}
            weekPlanId={weekPlan.id} />
        )}
      </div>

      <NewShopModal
        open={newShopOpen}
        hasExisting={!!weekPlan}
        onConfirm={handleStartNewShop}
        onClose={() => setNewShopOpen(false)} />
    </div>
  );
}
