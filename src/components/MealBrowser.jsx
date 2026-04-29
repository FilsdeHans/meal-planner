import { useEffect, useState } from 'react';
import { fetchMeals, fetchIngredients } from '../lib/meals';

const C = {
  forest:"#2c4a2e", sage:"#c8d9a0", sageLt:"#eef4e4",
  cream:"#faf7f2", warm:"#f5f0e8", amber:"#e8b86d", amberLt:"#fdf3e3",
  ink:"#1e1e1e", mid:"#6b6157", soft:"#b0a898", line:"#e8e2d8",
};

export default function MealBrowser() {
  const [meals, setMeals] = useState({});
  const [ingredients, setIngredients] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    Promise.all([fetchMeals(), fetchIngredients()])
      .then(([m, i]) => { setMeals(m); setIngredients(i); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding:20, color:C.mid }}>Loading meals from database…</div>;
  if (error)   return <div style={{ padding:20, color:"#c0392b" }}>Error: {error}</div>;

  // Group meals by type for display
  const groups = {
    "🌿 Friday meat-free":     [],
    "⭐ Weekend":              [],
    "🍴 Weeknight":            [],
    "🍽️ Other":                [],
  };
  for (const [key, meal] of Object.entries(meals)) {
    if (meal.eatOut)         groups["🍽️ Other"].push([key, meal]);
    else if (meal.fri)       groups["🌿 Friday meat-free"].push([key, meal]);
    else if (meal.weekend)   groups["⭐ Weekend"].push([key, meal]);
    else                     groups["🍴 Weeknight"].push([key, meal]);
  }
  for (const k in groups) groups[k].sort(([,a],[,b]) => a.name.localeCompare(b.name));

  const formatTags = (m) => {
    const tags = [];
    if (m.sundayOnly)   tags.push("Sunday only");
    if (m.texMex)       tags.push("Tex-Mex");
    if (m.indian)       tags.push("Indian");
    if (m.chinese)      tags.push("Chinese");
    if (m.seasonalMonths) tags.push(`Seasonal (${m.seasonalMonths.length} months)`);
    if (m.leftoverOf)   tags.push(`Leftovers from ${m.leftoverOf}`);
    if (m.spawns)       tags.push(`→ ${m.spawns}`);
    return tags;
  };

  return (
    <div>
      <div style={{ fontSize:11, color:C.mid, letterSpacing:1.5, textTransform:"uppercase",
        fontWeight:700, marginBottom:14 }}>
        🥘 Meal catalogue (live from Supabase)
      </div>

      {Object.entries(groups).map(([groupName, groupMeals]) => groupMeals.length > 0 && (
        <div key={groupName} style={{ marginBottom:14 }}>
          <div style={{ fontSize:11, fontWeight:700, color:C.mid, letterSpacing:1.5,
            textTransform:"uppercase", marginBottom:6, paddingLeft:4 }}>
            {groupName} ({groupMeals.length})
          </div>
          <div style={{ background:"#fff", borderRadius:12, overflow:"hidden",
            boxShadow:"0 1px 6px rgba(0,0,0,0.05)" }}>
            {groupMeals.map(([key, meal], i) => {
              const isOpen = expanded === key;
              const tags = formatTags(meal);
              return (
                <div key={key} style={{ borderTop: i > 0 ? `1px solid ${C.line}` : "none" }}>
                  <button onClick={() => setExpanded(isOpen ? null : key)}
                    style={{ width:"100%", background:"none", border:"none", padding:"12px 14px",
                      display:"flex", alignItems:"center", gap:10, cursor:"pointer", textAlign:"left" }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:14, fontWeight:600, color:C.ink,
                        fontFamily:"'Playfair Display',serif" }}>{meal.name}</div>
                      {tags.length > 0 && (
                        <div style={{ fontSize:10, color:C.mid, marginTop:2 }}>
                          {tags.join(" · ")}
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize:10, color:C.soft }}>
                      {meal.ingredients.length} ing · {isOpen ? "▾" : "▸"}
                    </div>
                  </button>
                  {isOpen && (
                    <div style={{ padding:"4px 14px 14px", background:C.warm, borderTop:`1px solid ${C.line}` }}>
                      <div style={{ fontSize:10, fontWeight:700, color:C.mid, letterSpacing:1.5,
                        textTransform:"uppercase", marginBottom:6, marginTop:8 }}>
                        Ingredients
                      </div>
                      {meal.ingredients.length === 0 ? (
                        <div style={{ fontSize:13, color:C.soft, fontStyle:"italic" }}>
                          No ingredients linked
                        </div>
                      ) : (
                        <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                          {meal.ingredients.map(ingKey => (
                            <span key={ingKey} style={{ background:"#fff", border:`1px solid ${C.line}`,
                              borderRadius:6, padding:"3px 8px", fontSize:12, color:C.ink }}>
                              {ingredients[ingKey]?.name || ingKey}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
