import { useEffect, useState } from 'react';
import { onAuthChange, getCurrentUser, signOut } from './lib/auth';
import { supabase } from './lib/supabase';
import SignIn from './components/SignIn';

const C = {
  forest:"#2c4a2e", sage:"#c8d9a0", sageLt:"#eef4e4",
  cream:"#faf7f2", warm:"#f5f0e8", ink:"#1e1e1e", mid:"#6b6157",
};

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [householdName, setHouseholdName] = useState(null);
  const [memberCount, setMemberCount] = useState(0);
  const [mealCount, setMealCount] = useState(0);

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
      const { count } = await supabase
        .from('meals')
        .select('*', { count: 'exact', head: true });
      setMealCount(count || 0);
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
    <div style={{ fontFamily:"'Lato',sans-serif", background:C.cream, minHeight:"100vh", padding:24 }}>
      <div style={{ maxWidth:430, margin:"0 auto" }}>
        <div style={{ background:"#fff", borderRadius:20, padding:"24px 22px",
          boxShadow:"0 2px 12px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize:32, marginBottom:8 }}>🥘</div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:700,
            color:C.ink }}>Welcome back!</div>
          <div style={{ fontSize:13, color:C.mid, marginBottom:18 }}>{user.email}</div>

          <div style={{ background:C.sageLt, borderRadius:12, padding:"14px 16px", marginBottom:14 }}>
            <div style={{ fontSize:11, color:C.forest, letterSpacing:1.5, textTransform:"uppercase",
              fontWeight:700, marginBottom:6 }}>Connection check</div>
            <div style={{ fontSize:13, color:C.ink, lineHeight:1.6 }}>
              ✅ Signed in to Supabase<br/>
              {householdName ? `🏡 Household: ${householdName} (${memberCount} member${memberCount === 1 ? '' : 's'})` : '⏳ No household yet — we\'ll create one next'}<br/>
              📋 {mealCount} meals available in catalogue
            </div>
          </div>

          <div style={{ fontSize:12, color:C.mid, marginBottom:16, lineHeight:1.5 }}>
            This is the foundation. Once we confirm everything's connected, we'll add the
            full meal planner, review and shopping flow.
          </div>

          <button onClick={signOut} style={{ width:"100%", padding:"11px 0",
            borderRadius:10, border:"none", background:C.warm, color:C.mid,
            fontSize:13, fontWeight:700, cursor:"pointer" }}>
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
