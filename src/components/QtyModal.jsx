import { useState, useEffect } from 'react';

const C = {
  forest:"#2c4a2e", sage:"#c8d9a0", sageLt:"#eef4e4",
  cream:"#faf7f2", warm:"#f5f0e8", ink:"#1e1e1e", mid:"#6b6157", line:"#e8e2d8",
};

export default function QtyModal({ item, onSave, onClose }) {
  const [val, setVal] = useState('1');
  const [unit, setUnit] = useState('');

  useEffect(() => {
    setVal(String(item?.qty ?? 1));
    setUnit(item?.unit || '');
  }, [item?.id]);

  if (!item) return null;

  const handleSave = (e) => {
    e.stopPropagation();
    const n = parseFloat(val);
    onSave(isNaN(n) || n <= 0 ? 1 : n, unit);
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:300,
      display:"flex", alignItems:"flex-end", justifyContent:"center" }} onClick={onClose}>
      <div style={{ background:"#fff", borderRadius:"20px 20px 0 0", padding:"24px 20px 44px",
        width:"100%", maxWidth:430 }} onClick={e => e.stopPropagation()}>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18, fontWeight:700,
          color:C.ink, marginBottom:16 }}>{item.display_name || item.name}</div>
        <div style={{ fontSize:11, color:C.mid, letterSpacing:1.5, textTransform:"uppercase",
          marginBottom:8 }}>Quantity</div>
        <input
          autoFocus
          inputMode="decimal"
          value={val}
          onChange={e => setVal(e.target.value)}
          onFocus={e => e.target.select()}
          style={{ width:"100%", border:`1.5px solid ${C.line}`, borderRadius:10,
            padding:"12px 14px", fontSize:20, fontFamily:"'Lato',sans-serif",
            boxSizing:"border-box", outline:"none", background:"#ffffff", color:C.ink,
            colorScheme:"light", marginBottom:14 }} />
        <div style={{ fontSize:11, color:C.mid, letterSpacing:1.5, textTransform:"uppercase",
          marginBottom:8 }}>Unit (optional)</div>
        <div style={{ display:"flex", gap:8, marginBottom:24 }}>
          {["", "g", "kg", "ml", "l"].map(u => (
            <button key={u || "none"}
              onMouseDown={e => e.preventDefault()}
              onClick={e => { e.stopPropagation(); setUnit(u); }}
              style={{ flex:1, padding:"9px 0", borderRadius:8,
                border:`1.5px solid ${unit === u ? C.forest : C.line}`,
                background: unit === u ? C.sageLt : "#fff",
                color: unit === u ? C.forest : C.mid,
                fontWeight: unit === u ? 700 : 400, fontSize:13, cursor:"pointer" }}>
              {u || "—"}
            </button>
          ))}
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onClose} style={{ flex:1, padding:"13px 0", borderRadius:10,
            border:"none", background:C.warm, color:C.mid, fontSize:14, fontWeight:700,
            cursor:"pointer" }}>Cancel</button>
          <button onClick={handleSave} style={{ flex:1, padding:"13px 0", borderRadius:10,
            border:"none", background:C.forest, color:"#fff", fontSize:14, fontWeight:700,
            cursor:"pointer" }}>Save</button>
        </div>
      </div>
    </div>
  );
}
