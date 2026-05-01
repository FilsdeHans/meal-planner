import { useState } from 'react';
import { suggestNextShopDate, toIsoDate } from '../lib/weekPlan';

const C = {
  forest:"#2c4a2e", sage:"#c8d9a0", sageLt:"#eef4e4",
  cream:"#faf7f2", warm:"#f5f0e8", ink:"#1e1e1e", mid:"#6b6157", line:"#e8e2d8",
};

export default function NewShopModal({ open, hasExisting, onConfirm, onClose }) {
  const [date, setDate] = useState(toIsoDate(suggestNextShopDate()));

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!date) return;
    onConfirm(date);
  };

  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)",
      zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
      <div onClick={e => e.stopPropagation()} style={{ background:"#fff", borderRadius:20,
        padding:"28px 24px", width:"100%", maxWidth:380,
        boxShadow:"0 8px 40px rgba(0,0,0,0.2)" }}>
        <div style={{ fontSize:28, textAlign:"center", marginBottom:12 }}>🛒</div>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:700,
          color:C.ink, marginBottom:8, textAlign:"center" }}>Start a new shop</div>
        {hasExisting && (
          <div style={{ fontSize:13, color:C.mid, textAlign:"center", marginBottom:18, lineHeight:1.5 }}>
            Your current plan will be archived (kept for history) and a fresh one created.
          </div>
        )}
        {!hasExisting && (
          <div style={{ fontSize:13, color:C.mid, textAlign:"center", marginBottom:18, lineHeight:1.5 }}>
            Pick the date you'll be doing the shop.
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div style={{ fontSize:11, color:C.mid, letterSpacing:1.5, textTransform:"uppercase",
            marginBottom:8 }}>Shop date</div>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} required
            style={{ width:"100%", border:`1.5px solid ${C.line}`, borderRadius:10,
              padding:"12px 14px", fontSize:16, fontFamily:"'Lato',sans-serif",
              boxSizing:"border-box", outline:"none", background:"#fff", color:C.ink,
              colorScheme:"light", marginBottom:20 }} />
          <div style={{ display:"flex", gap:10 }}>
            <button type="button" onClick={onClose} style={{ flex:1, padding:"13px 0",
              borderRadius:12, border:`1.5px solid ${C.line}`, background:"#fff", color:C.mid,
              fontSize:14, fontWeight:700, cursor:"pointer" }}>Cancel</button>
            <button type="submit" style={{ flex:1, padding:"13px 0", borderRadius:12,
              border:"none", background:C.forest, color:"#fff", fontSize:14, fontWeight:700,
              cursor:"pointer" }}>Start ✨</button>
          </div>
        </form>
      </div>
    </div>
  );
}
