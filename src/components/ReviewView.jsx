import { useState, useEffect } from 'react';
import {
  HOUSEHOLD_PROMPTS, AISLES,
  updateItemQty, deleteItem, addManualItem, updateWeekPlanStage, updateWeekPlanPrompts,
} from '../lib/shopping';
import QtyModal from './QtyModal';

const C = {
  forest:"#2c4a2e", sage:"#c8d9a0", sageLt:"#eef4e4",
  cream:"#faf7f2", warm:"#f5f0e8", amber:"#e8b86d", amberLt:"#fdf3e3",
  ink:"#1e1e1e", mid:"#6b6157", soft:"#b0a898", line:"#e8e2d8",
};

export default function ReviewView({ weekPlan, meals, items, householdId, onAdvance, refreshItems, syncItems }) {
  const [prompts, setPrompts] = useState(weekPlan.prompts || {});
  const [qtyModal, setQtyModal] = useState(null);
  const [addingItem, setAddingItem] = useState(false);
  const [newItemText, setNewItemText] = useState('');

  // Sync local prompts state from prop
  useEffect(() => { setPrompts(weekPlan.prompts || {}); }, [weekPlan.id]);

  const setPrompt = async (key, val) => {
    const next = { ...prompts, [key]: val };
    setPrompts(next);
    try {
      await updateWeekPlanPrompts(weekPlan.id, next);
      // syncItems re-builds the shopping list based on the latest plan + prompts
      if (syncItems) await syncItems();
    } catch (e) { console.error('Failed to save prompt:', e); }
  };

  const handleQtySave = async (qty, unit) => {
    if (!qtyModal) return;
    const id = qtyModal.id;
    setQtyModal(null);
    try {
      await updateItemQty(id, qty, unit);
      if (refreshItems) await refreshItems();
    } catch (e) { alert('Failed to save: ' + e.message); }
  };

  const handleDelete = async (id) => {
    try {
      await deleteItem(id);
      if (refreshItems) await refreshItems();
    } catch (e) { alert('Failed to remove: ' + e.message); }
  };

  const handleAddItem = async () => {
    if (!newItemText.trim()) return;
    try {
      await addManualItem(weekPlan.id, householdId, newItemText.trim());
      if (refreshItems) await refreshItems();
    } catch (e) { alert('Failed to add: ' + e.message); }
    setNewItemText('');
    setAddingItem(false);
  };

  const handleAdvance = async () => {
    try {
      await updateWeekPlanStage(weekPlan.id, 'shopping');
      onAdvance();
    } catch (e) {
      alert('Failed to advance: ' + e.message);
    }
  };

  // Meal-driven prompts to ask
  const mealPrompts = [];
  const seen = new Set();
  Object.values(weekPlan.plan || {}).forEach(mealKey => {
    const meal = meals[mealKey];
    if (!meal || meal.eatOut) return;
    if (meal.chipsPrompt && !seen.has(`chips_${mealKey}`)) {
      mealPrompts.push({ key:`chips_${mealKey}`, label:`${meal.name} — chips or wedges?`,
        options:["Chips","Wedges"], maps:{ "Chips":"chips","Wedges":"wedges" } });
      seen.add(`chips_${mealKey}`);
    }
    if (meal.peaPrompt && !seen.has(`peas_${mealKey}`)) {
      mealPrompts.push({ key:`peas_${mealKey}`, label:`${meal.name} — which peas?`,
        options:["Garden","Marrowfat"], maps:{ "Garden":"garden","Marrowfat":"marrowfat" } });
      seen.add(`peas_${mealKey}`);
    }
    if (meal.roastPrompt && !seen.has(`roast_${mealKey}`)) {
      mealPrompts.push({ key:`roast_${mealKey}`, label:`Roast — which meat?`,
        options:["Chicken","Lamb","Beef","Pork"] });
      seen.add(`roast_${mealKey}`);
    }
    if (meal.ribPrompt && !seen.has(`rib_${mealKey}`)) {
      mealPrompts.push({ key:`rib_${mealKey}`, label:`Ribs — Korean or Chinese?`,
        options:["Korean","Chinese"] });
      seen.add(`rib_${mealKey}`);
    }
    if (meal.texMex && !seen.has(`nachos_${mealKey}`)) {
      mealPrompts.push({ key:`nachos_${mealKey}`,
        label:`${meal.name} — add nachos as a side?`,
        options:["Yes","No"], maps:{ "Yes":"yes","No":"no" } });
      seen.add(`nachos_${mealKey}`);
    }
  });

  const pendingMealPrompts      = mealPrompts.filter(p => prompts[p.key] === undefined);
  const pendingHouseholdPrompts = HOUSEHOLD_PROMPTS.filter(h => prompts[`household_${h.id}`] === undefined);

  // Group items by aisle
  const itemsByAisle = {};
  AISLES.forEach(a => { itemsByAisle[a.id] = []; });
  items.forEach(it => {
    const aisle = it.aisle && itemsByAisle[it.aisle] ? it.aisle : 'extras';
    itemsByAisle[aisle].push(it);
  });

  const promptCard = (label, key, options, currentVal, isHousehold = false) => (
    <div style={{ background:"#fff", borderRadius:12, padding:"13px 14px", marginBottom:8,
      boxShadow:"0 1px 6px rgba(0,0,0,0.05)" }}>
      <div style={{ fontSize:14, fontWeight:600, color:C.ink, fontFamily:"'Playfair Display',serif",
        marginBottom:10 }}>{label}</div>
      <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
        {options.map(opt => {
          const stored = isHousehold && opt === 'No' ? 'no'
                       : isHousehold && opt === 'Yes' ? 'yes'
                       : opt;
          const isActive = currentVal === stored;
          return (
            <button key={opt}
              onClick={() => setPrompt(key, stored)}
              style={{ background: isActive ? C.forest : "#fff",
                color: isActive ? "#fff" : C.ink,
                border:`1.5px solid ${isActive ? C.forest : C.line}`,
                borderRadius:8, padding:"8px 14px", fontSize:13, cursor:"pointer",
                fontWeight: isActive ? 700 : 400 }}>
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div>
      {/* Meal prompts */}
      {pendingMealPrompts.length > 0 && (
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:10, fontWeight:700, color:C.mid, letterSpacing:2,
            textTransform:"uppercase", marginBottom:8 }}>🍴 Meal questions</div>
          {pendingMealPrompts.map(p => (
            <div key={p.key}>
              {promptCard(p.label, p.key, p.options, prompts[p.key], false)}
            </div>
          ))}
        </div>
      )}

      {/* Household prompts */}
      {pendingHouseholdPrompts.length > 0 && (
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:10, fontWeight:700, color:C.mid, letterSpacing:2,
            textTransform:"uppercase", marginBottom:8 }}>⏰ Due this week</div>
          {pendingHouseholdPrompts.map(h => {
            const pkey = `household_${h.id}`;
            const cur = prompts[pkey];
            if (h.type === 'yesno') {
              return (
                <div key={h.id}>
                  {promptCard(h.label, pkey, ["Yes","No"], cur, true)}
                </div>
              );
            }
            // select
            return (
              <div key={h.id}>
                {promptCard(h.label, pkey, ["No", ...h.options.map(o => o.label)], cur, false)}
              </div>
            );
          })}
        </div>
      )}

      {/* Shopping list preview */}
      <div style={{ marginBottom:16 }}>
        <div style={{ fontSize:10, fontWeight:700, color:C.mid, letterSpacing:2,
          textTransform:"uppercase", marginBottom:8 }}>🛒 Shopping list ({items.length} items)</div>
        {AISLES.map(({ id: aisleId, label }) => {
          const aisleItems = itemsByAisle[aisleId];
          if (!aisleItems || aisleItems.length === 0) return null;
          return (
            <div key={aisleId} style={{ marginBottom:12 }}>
              <div style={{ fontSize:10, fontWeight:700, color:C.mid, letterSpacing:1.5,
                textTransform:"uppercase", marginBottom:6, paddingLeft:4 }}>{label}</div>
              <div style={{ background:"#fff", borderRadius:12, overflow:"hidden",
                boxShadow:"0 1px 6px rgba(0,0,0,0.05)" }}>
                {aisleItems.map((it, i) => (
                  <div key={it.id} style={{ display:"flex", alignItems:"center",
                    borderTop: i > 0 ? `1px solid ${C.line}` : "none",
                    padding:"11px 14px", gap:10 }}>
                    <div style={{ flex:1, fontSize:14, color:C.ink }}>{it.display_name}</div>
                    <button onClick={() => setQtyModal(it)} style={{
                      background: it.is_modified ? C.amberLt : C.warm,
                      border:`1px solid ${it.is_modified ? C.amber : C.line}`,
                      borderRadius:8, padding:"4px 10px", fontSize:12,
                      color: it.is_modified ? "#a06a10" : C.mid, cursor:"pointer",
                      fontWeight: it.is_modified ? 700 : 400 }}>
                      {it.qty}{it.unit || ""}
                    </button>
                    <button onClick={() => handleDelete(it.id)} style={{ background:"none",
                      border:"none", color:C.soft, fontSize:20, cursor:"pointer", lineHeight:1,
                      padding:"0 2px" }}>×</button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add item */}
      {addingItem ? (
        <div style={{ background:"#fff", borderRadius:12, padding:14,
          boxShadow:"0 1px 6px rgba(0,0,0,0.05)", marginBottom:12 }}>
          <input autoFocus value={newItemText} onChange={e => setNewItemText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddItem()}
            placeholder="Add item…"
            style={{ width:"100%", border:`1.5px solid ${C.line}`, borderRadius:10,
              padding:"11px 13px", fontSize:15, outline:"none", background:"#ffffff",
              color:C.ink, colorScheme:"light", boxSizing:"border-box" }} />
          <div style={{ display:"flex", gap:10, marginTop:10 }}>
            <button onClick={() => setAddingItem(false)} style={{ flex:1, padding:"12px 0",
              borderRadius:10, border:"none", background:C.warm, color:C.mid, fontSize:14,
              fontWeight:700, cursor:"pointer" }}>Cancel</button>
            <button onClick={handleAddItem} style={{ flex:1, padding:"12px 0", borderRadius:10,
              border:"none", background:C.forest, color:"#fff", fontSize:14, fontWeight:700,
              cursor:"pointer" }}>Add</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAddingItem(true)} style={{ width:"100%", background:"#fff",
          border:`1.5px dashed ${C.soft}`, borderRadius:12, padding:14, fontSize:14, color:C.mid,
          cursor:"pointer", marginBottom:12 }}>
          + Add item
        </button>
      )}

      <div style={{ height:80 }} />
      <button onClick={handleAdvance} style={{ position:"fixed", bottom:24, left:"50%",
        transform:"translateX(-50%)", background:C.forest, color:"#fff", border:"none",
        borderRadius:50, padding:"15px 32px", fontSize:14, fontWeight:700, cursor:"pointer",
        boxShadow:"0 4px 20px rgba(44,74,46,0.4)", zIndex:50, whiteSpace:"nowrap" }}>
        List is ready 🛒
      </button>

      <QtyModal item={qtyModal} onSave={handleQtySave} onClose={() => setQtyModal(null)} />
    </div>
  );
}
