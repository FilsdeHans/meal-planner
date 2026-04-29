import { useEffect, useState } from 'react';
import { onAuthChange, getCurrentUser, signOut } from './lib/auth';
import { supabase } from './lib/supabase';
import { fetchMeals } from './lib/meals';
import { getWeekId, getWeekLabel, getOrCreateWeekPlan, subscribeToWeekPlan } from './lib/weekPlan';
import SignIn from './components/SignIn';
import PlanView from './components/PlanView';

const C = {
  forest:"#2c4a2e", sage:"#c8d9a0", sageLt:"#eef4e4",
  cream:"#faf7f2", warm:"#f5f0e8", ink:"#1e1e1e", mid:"#6b6157",
};

export default function App() {
  const [user, setUser]                     = useState(null);
  const [authLoading, setAuthLoading]       = useState(true);
  const [householdId, setHouseholdId]       = useState(null);
  const [householdName, setHouseholdName]   = useState(null);
  const [memberCount, setMemberCount]       = useState(0);
  const [meals, setMeals]                   = useState({});
  const [weekPlan, setWeekPlan]             = useState(null);
  const [dataLoading, setDataLoading]       = useState(false);
  const [error, setError]                   = useState(null);

  // Auth check
  useEffect(() => {
    getCurrentUser().then(u => { setUser(u); setAuthLoading(false); });
    const sub = onAuthChange(u => { setUser(u); setAuthLoading(false); });
    return () => sub.unsubscribe();
  }, []);

  // Load household & meals & week plan once signed in
  useEffect(() => {
    if (!user) return;
    let cleanup = () => {};
    setDataLoading(true);
    setError(null);

    (async () => {
      try {
        // Household
        const { data: members, error: membersErr } = await supabase
          .from('household_members')
          .select('household_id, households(name)');
        if (membersErr) throw membersErr;
        if (!members?.[0]) {
          setError("You're signed in but not yet linked to a household.");
          setDataLoading(false);
          return;
        }
        const hId = members[0].household_id;
        setHouseholdId(hId);
        setHouseholdName(members[0].households?.name);
        setMemberCount(members.length);

        // Meals
        const m = await fetchMeals();
        setMeals(m);

        // Week plan
        const weekId = getWeekId();
        const wp = await getOrCreateWeekPlan(hId, weekId, m);
        setWeekPlan(wp);

        // Real-time subscription
        cleanup = subscribeToWeekPlan(wp.id, (updated) => {
          setWeekPlan(updated);
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setDataLoading(false);
      }
    })();

    return () => cleanup();
  }, [user]);

  if (authLoading) {
    return (
      <div style={{ fontFamily:"'Lato',sans-serif", background:C.cream, minHeight:"100vh",
        display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ color:C.mid }}>Loading…</div>
      </div>
    );
  }

  if (!user) return <SignIn />;

  return (
    <div style={{ fontFamily:"'Lato',sans-serif", background:C.cream, minHeight:"100vh",
      paddingBottom:40 }}>
      {/* Header */}
      <div style={{ background:C.forest, padding:"18px 20px",
        boxShadow:"0 2px 12px rgba(0,0,0,0.15)" }}>
        <div style={{ maxWidth:430, margin:"0 auto",
          display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ color:C.sage, fontSize:10, letterSpacing:3, textTransform:"uppercase" }}>
              {householdName || "—"}
            </div>
            <div style={{ color:"#fff", fontSize:20, fontWeight:700,
              fontFamily:"'Playfair Display',serif" }}>Meal Planner</div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ color:C.sage, fontSize:11 }}>{getWeekLabel()}</div>
            <button onClick={signOut} style={{ background:"rgba(255,255,255,0.1)",
              border:"none", color:C.sage, padding:"4px 10px", borderRadius:6, fontSize:11,
              cursor:"pointer", marginTop:4 }}>
              Sign out
            </button>
          </div>
        </div>
      </div>

      {/* Main */}
      <div style={{ maxWidth:430, margin:"0 auto", padding:"16px" }}>
        {error && (
          <div style={{ background:"#fff8f8", border:"1px solid #f5c0c0", borderRadius:12,
            padding:"12px 14px", marginBottom:14, fontSize:13, color:"#c0392b" }}>
            {error}
          </div>
        )}

        {dataLoading && (
          <div style={{ padding:"40px 20px", textAlign:"center", color:C.mid, fontSize:13 }}>
            Loading your meal plan…
          </div>
        )}

        {!dataLoading && weekPlan && (
          <PlanView
            weekPlan={weekPlan}
            meals={meals}
            onPlanUpdate={(plan) => setWeekPlan(prev => ({ ...prev, plan }))}
          />
        )}
      </div>
    </div>
  );
}
