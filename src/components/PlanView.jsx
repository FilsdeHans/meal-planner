import { useState } from 'react';
import { updatePlan } from '../lib/weekPlan';

const C = {
  forest:"#2c4a2e", forestLt:"#3d6640", sage:"#c8d9a0", sageLt:"#eef4e4",
  cream:"#faf7f2", warm:"#f5f0e8", amber:"#e8b86d", amberLt:"#fdf3e3",
  ink:"#1e1e1e", mid:"#6b6157", soft:"#b0a898", line:"#e8e2d8",
};

const DAYS = ["friday","saturday","sunday","monday","tuesday","wednesday","thursday"];
const DAY_SHORT = { friday:"Fri", saturday:"Sat", sunday:"Sun", monday:"Mon",
                    tuesday:"Tue", wednesday:"Wed", thursday:"Thu" };
const DAY_FULL  = { friday:"Friday", saturday:"Saturday", sunday:"Sunday",
                    monday:"Monday", tuesday:"Tuesday", wednesday:"Wednesday", thursday:"Thursday" };

function MealPickerModal({ day, currentId, meals, onPick, onClose }) {
  const [search, setSearch] = useState('');
  const all = Object.entries(meals)
    .filter(([id, m]) => id !== currentId && !m.eatOut)
    .sort(([,a],[,b]) => a.name.localeCompare(b.name));
  const filtered = search.trim()
    ? all.filter(([,m]) => m.name.toLowerCase().includes(search.toLowerCase()))
    : all;

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", zIndex:300,
      display:"flex", alignItems:"flex-end", justifyContent:"center" }} onClick={onClose}>
      <div style={{ background:"#fff", borderRadius:"20px 20px 0 0", padding:"20px 20px 0",
        width:"100%", maxWidth:430, maxHeight:"80vh", display:"flex", flexDirection:"column" }}
        onClick={e => e.stopPropagation()}>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:17, fontWeight:700,
          color:C.ink, marginBottom:4 }}>All meals — {DAY_FULL[day]}</div>
        <div style={{ fontSize:11, color:C.mid, marginBottom:12 }}>No restrictions — pick any meal</div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search meals…"
          style={{ border:`1.5px solid ${C.line}`, borderRadius:10, padding:"10px 14px",
            fontSize:14, outline:"none", background:C.cream, marginBottom:12 }} />
        <div style={{ overflowY:"auto", paddingBottom:40 }}>
          {filtered.map(([id, m]) => (
            <button key={id} onClick={() => onPick(id)} style={{ width:"100%",
              background:id === currentId ? C.sageLt : "#fff", border:"none",
              borderTop:`1px solid ${C.line}`, padding:"13px 14px", textAlign:"left", fontSize:14,
              color:C.ink, cursor:"pointer", fontFamily:"'Playfair Display',serif",
              display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <span>{m.name}</span>
              <span style={{ fontSize:10, color:C.mid }}>
                {m.fri ? "🌿" : ""}{m.weekend ? "⭐" : ""}{m.sundayOnly ? "🍗" : ""}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function PlanView({ weekPlan, meals, onPlanUpdate }) {
  const [openDay, setOpenDay]     = useState(null);
  const [pickerDay, setPickerDay] = useState(null);
  const [saving, setSaving]       = useState(false);

  const plan = weekPlan.plan || {};

  const swapMeal = async (day, mealId) => {
    setOpenDay(null);
    setPickerDay(null);
    const newPlan = { ...plan, [day]: mealId };
    setSaving(true);
    try {
      await updatePlan(weekPlan.id, newPlan);
      onPlanUpdate(newPlan); // optimistic local update; real-time will confirm
    } catch (err) {
      alert('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const getQuickSwaps = (day) => {
    const isFri = day === "friday";
    const isSun = day === "sunday";
    const isWknd = day === "saturday" || day === "sunday";
    return Object.entries(meals)
      .filter(([id, m]) => {
        if (id === plan[day]) return false;
        if (m.eatOut) return false;
        if (Object.values(plan).includes(id) && id !== "chicken_fried_rice") return false;
        if (isFri) return m.fri === true;
        if (isSun) return m.sundayOnly || m.weekend;
        if (isWknd) return m.weekend && !m.sundayOnly;
        return !m.fri && !m.weekend;
      })
      .slice(0, 4)
      .map(([id, m]) => ({ id, name: m.name }));
  };

  const getDayType = (day) => {
    if (day === "friday") return "fri";
    if (day === "saturday" || day === "sunday") return "wknd";
    return "wkday";
  };

  const getBorderColor = (day) => {
    if (day === "friday") return C.sage;
    if (day === "saturday" || day === "sunday") return C.amber;
    return C.line;
  };

  return (
    <div>
      <div style={{ fontSize:12, color:C.mid, marginBottom:14,
        display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span>Tap a day to swap the suggested meal</span>
        {saving && <span style={{ fontSize:11, color:C.forest }}>Saving…</span>}
      </div>

      {DAYS.map(day => {
        const mealId = plan[day];
        const meal = meals[mealId];
        if (!meal) {
          return (
            <div key={day} style={{ background:"#fff", borderRadius:14, padding:"14px 16px",
              marginBottom:10, color:C.soft, fontSize:13 }}>
              {DAY_FULL[day]} — no meal yet
              <button onClick={() => setPickerDay(day)} style={{ marginLeft:12, background:C.warm,
                border:"none", borderRadius:8, padding:"4px 10px", fontSize:12, cursor:"pointer" }}>
                Pick…
              </button>
            </div>
          );
        }
        const isOpen = openDay === day;
        const isEatOut = meal.eatOut;
        const dtype = getDayType(day);
        const bc = isEatOut ? "#9b9b9b" : getBorderColor(day);
        const quickSwaps = getQuickSwaps(day);
        const icon = isEatOut ? "🍽️" : dtype === "fri" ? "🌿" : dtype === "wknd" ? "⭐" : "🍴";
        const pillBg = isEatOut ? "#f0f0f0" : dtype === "fri" ? C.sageLt
                     : dtype === "wknd" ? C.amberLt : C.warm;
        const tagText = isEatOut ? "" : dtype === "fri" ? "Meat free ·"
                      : dtype === "wknd" ? "Weekend ·" : "";
        return (
          <div key={day} style={{ background:"#fff", borderRadius:14,
            boxShadow:"0 1px 8px rgba(0,0,0,0.07)", overflow:"hidden", marginBottom:10,
            border:`1.5px solid ${isOpen ? bc : "transparent"}`,
            opacity: isEatOut ? 0.75 : 1 }}>
            <button onClick={() => setOpenDay(isOpen ? null : day)} style={{ width:"100%",
              background: isOpen ? C.warm : "#fff", border:"none", borderLeft:`4px solid ${bc}`,
              padding:"13px 14px", display:"flex", alignItems:"center", gap:12, cursor:"pointer",
              textAlign:"left" }}>
              <div style={{ minWidth:38, height:38, borderRadius:10, background:pillBg,
                display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:1 }}>
                <span style={{ fontSize:9, color:C.mid, textTransform:"uppercase", letterSpacing:1 }}>
                  {DAY_SHORT[day]}
                </span>
                <span style={{ fontSize:15 }}>{icon}</span>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:15, color: isEatOut ? C.mid : C.ink, fontWeight:600,
                  fontFamily:"'Playfair Display',serif", lineHeight:1.2,
                  fontStyle: isEatOut ? "italic" : "normal" }}>
                  {meal.name}
                </div>
                <div style={{ fontSize:10, color:C.mid, marginTop:2 }}>
                  {tagText} {DAY_FULL[day]}
                  {meal.spawns && " · 🔁 leftovers → Chicken Fried Rice"}
                </div>
              </div>
              <span style={{ color:C.soft, fontSize:16,
                transform: isOpen ? "rotate(180deg)" : "none", transition:"transform 0.2s" }}>⌄</span>
            </button>
            {isOpen && (
              <div style={{ borderTop:`1px solid ${C.line}`, padding:"12px 14px 14px",
                background:C.warm }}>
                <div style={{ fontSize:10, fontWeight:700, color:C.mid, letterSpacing:2,
                  textTransform:"uppercase", marginBottom:8 }}>Quick swap:</div>
                {mealId !== "eat_out" && (
                  <button onClick={() => swapMeal(day, "eat_out")} style={{ width:"100%",
                    background:"#fff", border:`1px solid ${C.line}`, borderRadius:8,
                    padding:"11px 14px", textAlign:"left", fontSize:14, color:C.mid,
                    cursor:"pointer", fontFamily:"'Playfair Display',serif", marginBottom:6,
                    fontStyle:"italic" }}>
                    🍽️ Eating out / Takeaway
                  </button>
                )}
                {quickSwaps.map(({ id, name }) => (
                  <button key={id} onClick={() => swapMeal(day, id)} style={{ width:"100%",
                    background:"#fff", border:`1px solid ${C.line}`, borderRadius:8,
                    padding:"11px 14px", textAlign:"left", fontSize:14, color:C.ink,
                    cursor:"pointer", fontFamily:"'Playfair Display',serif", marginBottom:6 }}>
                    {name}
                  </button>
                ))}
                <button onClick={() => { setOpenDay(null); setPickerDay(day); }} style={{
                  width:"100%", background:"transparent", border:`1.5px dashed ${C.soft}`,
                  borderRadius:8, padding:"10px 14px", textAlign:"center", fontSize:13,
                  color:C.mid, cursor:"pointer", marginTop:2 }}>
                  More options…
                </button>
              </div>
            )}
          </div>
        );
      })}

      {pickerDay && (
        <MealPickerModal day={pickerDay} currentId={plan[pickerDay]} meals={meals}
          onPick={id => swapMeal(pickerDay, id)} onClose={() => setPickerDay(null)} />
      )}
    </div>
  );
}
