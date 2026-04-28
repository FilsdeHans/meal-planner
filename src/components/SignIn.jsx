import { useState } from 'react';
import { signInWithEmail } from '../lib/auth';

const C = {
  forest:"#2c4a2e", sage:"#c8d9a0", sageLt:"#eef4e4",
  cream:"#faf7f2", warm:"#f5f0e8", ink:"#1e1e1e", mid:"#6b6157", line:"#e8e2d8",
};

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | sending | sent | error
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus('sending');
    setError('');
    try {
      await signInWithEmail(email.trim());
      setStatus('sent');
    } catch (err) {
      setError(err.message || 'Something went wrong');
      setStatus('error');
    }
  };

  return (
    <div style={{
      fontFamily:"'Lato', sans-serif", background:C.cream, minHeight:"100vh",
      display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
      padding:24,
    }}>
      <div style={{ background:"#fff", borderRadius:20, padding:"32px 28px",
        width:"100%", maxWidth:380, boxShadow:"0 4px 20px rgba(0,0,0,0.08)" }}>
        <div style={{ fontSize:36, textAlign:"center", marginBottom:14 }}>🥘</div>
        <div style={{ fontFamily:"'Playfair Display', serif", fontSize:24, fontWeight:700,
          color:C.ink, textAlign:"center", marginBottom:6 }}>Meal Planner</div>
        <div style={{ fontSize:13, color:C.mid, textAlign:"center", marginBottom:24 }}>
          Sign in with your email
        </div>

        {status === 'sent' ? (
          <div style={{ background:C.sageLt, border:`1px solid ${C.sage}`, borderRadius:12,
            padding:"16px 18px", textAlign:"center" }}>
            <div style={{ fontSize:24, marginBottom:8 }}>✉️</div>
            <div style={{ fontWeight:700, color:C.forest, marginBottom:4 }}>Check your inbox</div>
            <div style={{ fontSize:13, color:C.mid }}>
              We've sent a sign-in link to <strong>{email}</strong>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              style={{
                width:"100%", border:`1.5px solid ${C.line}`, borderRadius:10,
                padding:"12px 14px", fontSize:16, fontFamily:"'Lato', sans-serif",
                boxSizing:"border-box", outline:"none", background:C.cream, marginBottom:14,
              }}
            />
            <button type="submit" disabled={status === 'sending'} style={{
              width:"100%", padding:"13px 0", borderRadius:10, border:"none",
              background:status === 'sending' ? C.mid : C.forest, color:"#fff",
              fontSize:14, fontWeight:700, cursor:status === 'sending' ? 'wait' : 'pointer',
            }}>
              {status === 'sending' ? 'Sending…' : 'Send sign-in link'}
            </button>
            {error && (
              <div style={{ color:"#c0392b", fontSize:12, marginTop:10, textAlign:"center" }}>
                {error}
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
