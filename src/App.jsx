import { useEffect, useState } from 'react';
import { onAuthChange, getCurrentUser, signOut } from './lib/auth';
import { supabase } from './lib/supabase';
import SignIn from './components/SignIn';
import MealBrowser from './components/MealBrowser';

const C = {
  forest:"#2c4a2e", sage:"#c8d9a0", sageLt:"#eef4e4",
  cream:"#faf7f2", warm:"#f5f0e8", ink:"#1e1e1e", mid:"#6b6157",
};

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [householdName, setHouseholdName] = useState(null);
  const [memberCount, setMemberCount] = useState(0);

  useEffect(() => {
    getCurrentUser().then(u => { setUser(u); setLoading(false); });
    const sub = onAuthChange(u => { setUser(u); setLoading(false); });
    return () => sub.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: members } = await supabase
        .from('household_members')
        .select('household_id, households(name)');
      if (members?.[0]) {
        setHouseholdName(members[0].households?.name);
        setMemberCount(members.length);
      }
    })();
  }, [user]);

  if (loading) {
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
      <div style={{ background:C.forest, padding:"18px 20px", boxShadow:"0 2px 12px rgba(0,0,0,0.15)" }}>
        <div style={{ maxWidth:430, margin:"0 auto",
          display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ color:C.sage, fontSize:10, letterSpacing:3, textTransform:"uppercase" }}>
              {householdName || "—"}
            </div>
            <div style={{ color:"#fff", fontSize:20, fontWeight:700,
              fontFamily:"'Playfair Display',serif" }}>Meal Planner</div>
          </div>
          <button onClick={signOut} style={{ background:"rgba(255,255,255,0.1)",
            border:"none", color:C.sage, padding:"6px 12px", borderRadius:8, fontSize:12,
            cursor:"pointer" }}>
            Sign out
          </button>
        </div>
      </div>

      {/* Main */}
      <div style={{ maxWidth:430, margin:"0 auto", padding:"16px" }}>
        <div style={{ background:C.sageLt, borderRadius:12, padding:"12px 14px", marginBottom:16,
          fontSize:12, color:C.forest }}>
          ✅ Stage 1: meals loading from Supabase. Tap any meal to see its ingredients.
        </div>
        <MealBrowser />
      </div>
    </div>
  );
}
