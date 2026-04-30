import { useState } from 'react';
import { signInWithEmail, verifyOtp } from '../lib/auth';

const C = {
  forest:"#2c4a2e", sage:"#c8d9a0", sageLt:"#eef4e4",
  cream:"#faf7f2", warm:"#f5f0e8", ink:"#1e1e1e", mid:"#6b6157", line:"#e8e2d8",
};

export default function SignIn() {
  const [step, setStep] = useState('email'); // 'email' | 'code'
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const sendCode = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus('sending');
    setError('');
    try {
      await signInWithEmail(email.trim());
      setStatus('idle');
      setStep('code');
    } catch (err) {
      setError(err.message || 'Something went wrong');
      setStatus('idle');
    }
  };

  const submitCode = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    setStatus('verifying');
    setError('');
    try {
      await verifyOtp(email.trim(), code.trim());
      // onAuthChange in App.jsx will pick up the new session
    } catch (err) {
      setError(err.message || 'Invalid code');
      setStatus('idle');
    }
  };

  const startOver = () => {
    setStep('email');
    setCode('');
    setError('');
    setStatus('idle');
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

        {step === 'email' && (
          <>
            <div style={{ fontSize:13, color:C.mid, textAlign:"center", marginBottom:24 }}>
              Sign in with your email
            </div>
            <form onSubmit={sendCode}>
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
                  boxSizing:"border-box", outline:"none", background:"#ffffff",
                  color:C.ink, colorScheme:"light", marginBottom:14,
                }}
              />
              <button type="submit" disabled={status === 'sending'} style={{
                width:"100%", padding:"13px 0", borderRadius:10, border:"none",
                background:status === 'sending' ? C.mid : C.forest, color:"#fff",
                fontSize:14, fontWeight:700, cursor:status === 'sending' ? 'wait' : 'pointer',
              }}>
                {status === 'sending' ? 'Sending…' : 'Send code'}
              </button>
              {error && (
                <div style={{ color:"#c0392b", fontSize:12, marginTop:10, textAlign:"center" }}>
                  {error}
                </div>
              )}
            </form>
          </>
        )}

        {step === 'code' && (
          <>
            <div style={{ fontSize:13, color:C.mid, textAlign:"center", marginBottom:6 }}>
              Check your inbox
            </div>
            <div style={{ fontSize:12, color:C.mid, textAlign:"center", marginBottom:20 }}>
              We sent a 6-digit code to <strong>{email}</strong>
            </div>
            <form onSubmit={submitCode}>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                value={code}
                onChange={e => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                placeholder="000000"
                required
                autoFocus
                style={{
                  width:"100%", border:`1.5px solid ${C.line}`, borderRadius:10,
                  padding:"14px", fontSize:24, fontFamily:"'Lato', sans-serif",
                  boxSizing:"border-box", outline:"none", background:"#ffffff",
                  color:C.ink, colorScheme:"light", marginBottom:14,
                  textAlign:"center", letterSpacing:6, fontWeight:700,
                }}
              />
              <button type="submit" disabled={status === 'verifying' || code.length !== 6}
                style={{
                  width:"100%", padding:"13px 0", borderRadius:10, border:"none",
                  background:(status === 'verifying' || code.length !== 6) ? C.mid : C.forest,
                  color:"#fff", fontSize:14, fontWeight:700,
                  cursor:(status === 'verifying' || code.length !== 6) ? 'wait' : 'pointer',
                }}>
                {status === 'verifying' ? 'Verifying…' : 'Sign in'}
              </button>
              {error && (
                <div style={{ color:"#c0392b", fontSize:12, marginTop:10, textAlign:"center" }}>
                  {error}
                </div>
              )}
              <button type="button" onClick={startOver} style={{
                width:"100%", marginTop:12, background:"transparent", border:"none",
                color:C.mid, fontSize:12, cursor:"pointer", textDecoration:"underline",
              }}>
                Use a different email
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
