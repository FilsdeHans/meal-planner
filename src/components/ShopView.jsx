import { AISLES, updateItemStatus } from '../lib/shopping';

const C = {
  forest:"#2c4a2e", sage:"#c8d9a0", sageLt:"#eef4e4",
  cream:"#faf7f2", warm:"#f5f0e8", amber:"#e8b86d", amberLt:"#fdf3e3",
  ink:"#1e1e1e", mid:"#6b6157", soft:"#b0a898", line:"#e8e2d8",
};

export default function ShopView({ items, refreshItems }) {
  const cycle = async (item) => {
    const next = !item.status || item.status === 'pending' ? 'got'
               : item.status === 'got' ? 'unavailable'
               : 'pending';
    try {
      await updateItemStatus(item.id, next);
      if (refreshItems) await refreshItems();
    } catch (e) { alert('Failed: ' + e.message); }
  };

  const totalItems   = items.length;
  const gotCount     = items.filter(i => i.status === 'got').length;
  const unavailCount = items.filter(i => i.status === 'unavailable').length;
  const remainCount  = totalItems - gotCount - unavailCount;
  const unavailItems = items.filter(i => i.status === 'unavailable');

  // Group by aisle, with sort: pending → unavailable → got
  const itemsByAisle = {};
  AISLES.forEach(a => { itemsByAisle[a.id] = []; });
  items.forEach(it => {
    const aisle = it.aisle && itemsByAisle[it.aisle] ? it.aisle : 'extras';
    itemsByAisle[aisle].push(it);
  });

  const sortKey = (it) => it.status === 'got' ? 2 : it.status === 'unavailable' ? 1 : 0;

  const renderItem = (item, i, showBorder) => {
    const isGot     = item.status === 'got';
    const isUnavail = item.status === 'unavailable';
    return (
      <div key={item.id} style={{
        borderTop: showBorder && i > 0 ? `1px solid ${C.line}` : "none",
        background: isUnavail ? "#fff8f8" : "#fff",
      }}>
        <div style={{ padding:"14px 16px", display:"flex", alignItems:"center", gap:14 }}>
          <button onClick={() => cycle(item)} style={{ width:30, height:30, borderRadius:8,
            border:"none",
            background: isGot ? C.forest : isUnavail ? "#e74c3c" : C.line,
            display:"flex", alignItems:"center", justifyContent:"center",
            flexShrink:0, cursor:"pointer", transition:"all 0.15s" }}>
            {isGot && <span style={{ color:"#fff", fontSize:15, fontWeight:700 }}>✓</span>}
            {isUnavail && <span style={{ color:"#fff", fontSize:13 }}>✕</span>}
          </button>
          <span style={{ flex:1, fontSize:17,
            color: isGot ? C.soft : isUnavail ? "#c0392b" : C.ink,
            textDecoration: isGot ? "line-through" : "none",
            transition:"all 0.15s", lineHeight:1.3 }}>
            {item.display_name}
            {isUnavail && <span style={{ display:"block", fontSize:11, color:"#c0392b",
              marginTop:2 }}>Not available — pick up elsewhere</span>}
          </span>
          {item.is_modified && (
            <div style={{ background:C.amber, color:"#fff", borderRadius:10, padding:"5px 12px",
              fontSize:14, fontWeight:900, letterSpacing:0.5, flexShrink:0 }}>
              {item.qty}{item.unit || ""}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Progress */}
      <div style={{ marginBottom:16 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
          marginBottom:8 }}>
          <div style={{ fontSize:13, color:C.mid }}>
            <span style={{ fontWeight:700, color:C.ink }}>{remainCount}</span> remaining ·{' '}
            <span style={{ color:C.forest, fontWeight:700 }}>{gotCount} ✓</span>
            {unavailCount > 0 && (
              <span style={{ color:"#e74c3c", fontWeight:700 }}> · {unavailCount} unavailable</span>
            )}
          </div>
          <div style={{ background:C.sageLt, color:C.forest, borderRadius:20,
            padding:"4px 12px", fontSize:11, fontWeight:700 }}>
            {totalItems > 0 ? Math.round(gotCount / totalItems * 100) : 0}%
          </div>
        </div>
        <div style={{ height:6, borderRadius:3, background:C.line, overflow:"hidden" }}>
          <div style={{ height:"100%", borderRadius:3, background:C.forest,
            width:`${totalItems > 0 ? (gotCount / totalItems * 100) : 0}%`,
            transition:"width 0.3s" }} />
        </div>
      </div>

      <div style={{ fontSize:11, color:C.soft, marginBottom:14, textAlign:"center" }}>
        Tap ✓ to mark got · tap again to mark unavailable · tap again to undo
      </div>

      {/* Items by aisle */}
      {AISLES.map(({ id: aisleId, label }) => {
        const aisleItems = itemsByAisle[aisleId];
        if (!aisleItems || aisleItems.length === 0) return null;
        const sorted = [...aisleItems].sort((a,b) => sortKey(a) - sortKey(b));
        return (
          <div key={aisleId} style={{ marginBottom:12 }}>
            <div style={{ fontSize:10, fontWeight:700, color:C.mid, letterSpacing:1.5,
              textTransform:"uppercase", marginBottom:6, paddingLeft:4 }}>{label}</div>
            <div style={{ borderRadius:12, overflow:"hidden",
              boxShadow:"0 1px 6px rgba(0,0,0,0.05)" }}>
              {sorted.map((it, i) => renderItem(it, i, true))}
            </div>
          </div>
        );
      })}

      {/* Unavailable summary */}
      {unavailItems.length > 0 && (
        <div style={{ background:"#fff8f8", border:"1.5px solid #f5c0c0", borderRadius:12,
          padding:"14px 16px", marginTop:8 }}>
          <div style={{ fontSize:11, fontWeight:700, color:"#c0392b", letterSpacing:1.5,
            textTransform:"uppercase", marginBottom:8 }}>🏪 Pick up elsewhere</div>
          {unavailItems.map(item => (
            <div key={item.id} style={{ fontSize:15, color:"#c0392b", padding:"4px 0",
              borderTop:"1px solid #f5c0c0" }}>
              {item.display_name}
              {item.is_modified ? ` — ${item.qty}${item.unit || ""}` : ""}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
