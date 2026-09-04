import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Auth States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inGameName, setInGameName] = useState('');

  // App Config & Data
  const [appName, setAppName] = useState('FF TOURNAMENT');
  const [walletBalance, setWalletBalance] = useState(0);
  const [tournaments, setTournaments] = useState([]);
  const [config] = useState({
    entryFee: 10,
    firstPrize: 100,
    secondPrize: 50,
    killReward: 3,
    supportContact: '8453950403'
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) initUser(session.user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) initUser(session.user);
    });

    return () => subscription.unsubscribe();
  }, []);

  const initUser = async (user) => {
    setLoading(true);
    let { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (!prof) {
      const regId = 'FFT-' + Math.floor(100000 + Math.random() * 900000);
      const { data: newProf } = await supabase.from('profiles').insert([
        { id: user.id, email: user.email, registration_id: regId, ign: inGameName || 'Player' }
      ]).select().single();
      prof = newProf;
    }
    setProfile(prof);

    let { data: w } = await supabase.from('wallets').select('balance').eq('user_id', user.id).single();
    setWalletBalance(w ? w.balance : 0);
    setLoading(false);
  };

  const handleAuth = async (type) => {
    setLoading(true);
    setMessage('');
    let res = type === 'signup' 
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });

    if (res.error) setMessage(res.error.message);
    else setShowAuthModal(false);
    setLoading(false);
  };

  return (
    <div style={{ backgroundColor: '#090a0f', color: '#f0f0f5', minHeight: '100vh', fontFamily: "'Montserrat', sans-serif" }}>
      
      {/* Top Header Navigation */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', backgroundColor: '#0d0e15', borderBottom: '1px solid #1a1d2e' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ backgroundColor: '#f39c12', color: '#000', fontWeight: '900', padding: '4px 8px', borderRadius: '4px', fontSize: '14px' }}>FF</span>
          <h2 style={{ color: '#fff', margin: 0, fontSize: '18px', fontWeight: '800', letterSpacing: '1.5px' }}>{appName}</h2>
        </div>
        
        {session ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ backgroundColor: '#1a271d', color: '#2ecc71', border: '1px solid #27ae60', padding: '6px 14px', borderRadius: '20px', fontWeight: 'bold', fontSize: '13px' }}>
              💰 ₹{walletBalance}
            </span>
            <button onClick={() => supabase.auth.signOut()} style={{ backgroundColor: '#1a1d2e', color: '#aaa', border: 'none', padding: '8px 14px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', textTransform: 'uppercase', fontWeight: 'bold' }}>
              Logout
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => setShowAuthModal(true)} style={{ background: 'linear-gradient(135deg, #e67e22 0%, #d35400 100%)', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', letterSpacing: '1px' }}>
              JOIN NOW
            </button>
          </div>
        )}
      </header>

      {/* Main Hero Landing Section */}
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px', textAlign: 'center' }}>
        
        <div style={{ display: 'inline-block', backgroundColor: '#1e160e', border: '1px solid #d3540066', padding: '6px 16px', borderRadius: '20px', fontSize: '12px', color: '#e67e22', fontWeight: 'bold', letterSpacing: '1px', marginBottom: '24px' }}>
          🔥 SEASON 1 COMING SOON
        </div>

        <h1 style={{ fontSize: '36px', fontWeight: '900', lineHeight: '1.2', letterSpacing: '2px', textTransform: 'uppercase', margin: '0 0 16px 0', color: '#ffffff' }}>
          DOMINATE THE <br />
          <span style={{ background: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            FREE FIRE TOURNAMENT
          </span>
        </h1>

        <p style={{ color: '#8b8d9b', fontSize: '14px', lineHeight: '1.6', maxWidth: '580px', margin: '0 auto 30px auto' }}>
          The premier competitive platform for Free Fire players. Join tournaments, build your reputation, and climb the ranks.
        </p>

        {!session && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '340px', margin: '0 auto 40px auto' }}>
            <button onClick={() => setShowAuthModal(true)} style={{ background: 'linear-gradient(135deg, #f39c12 0%, #d35400 100%)', color: '#000', border: 'none', padding: '16px', borderRadius: '8px', fontWeight: '900', fontSize: '14px', letterSpacing: '1px', cursor: 'pointer', textTransform: 'uppercase', boxShadow: '0 4px 20px rgba(230, 126, 34, 0.3)' }}>
              🎮 CREATE ACCOUNT
            </button>
          </div>
        )}

        {/* Prize Pool Details Grid */}
        <div style={{ borderTop: '1px solid #1a1d2e', paddingTop: '30px', marginTop: '20px' }}>
          <small style={{ color: '#e67e22', letterSpacing: '2px', fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase' }}>MATCH DETAILS</small>
          <h3 style={{ fontSize: '20px', margin: '6px 0 20px 0', textTransform: 'uppercase', letterSpacing: '1px' }}>PRIZE POOL BREAKDOWN</h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '14px' }}>
            <div style={{ backgroundColor: '#0f111a', padding: '16px', borderRadius: '10px', border: '1px solid #1a1d2e' }}>
              <small style={{ color: '#6c6e7e', fontSize: '10px', letterSpacing: '1px', fontWeight: 'bold' }}>ENTRY FEE</small>
              <h2 style={{ color: '#fff', margin: '6px 0 0 0' }}>₹{config.entryFee}</h2>
            </div>
            <div style={{ backgroundColor: '#0f111a', padding: '16px', borderRadius: '10px', border: '1px solid #27ae6044' }}>
              <small style={{ color: '#2ecc71', fontSize: '10px', letterSpacing: '1px', fontWeight: 'bold' }}>1ST PRIZE</small>
              <h2 style={{ color: '#2ecc71', margin: '6px 0 0 0' }}>₹{config.firstPrize}</h2>
            </div>
            <div style={{ backgroundColor: '#0f111a', padding: '16px', borderRadius: '10px', border: '1px solid #1a1d2e' }}>
              <small style={{ color: '#6c6e7e', fontSize: '10px', letterSpacing: '1px', fontWeight: 'bold' }}>2ND PRIZE</small>
              <h2 style={{ color: '#fff', margin: '6px 0 0 0' }}>₹{config.secondPrize}</h2>
            </div>
            <div style={{ backgroundColor: '#0f111a', padding: '16px', borderRadius: '10px', border: '1px solid #e67e2244' }}>
              <small style={{ color: '#e67e22', fontSize: '10px', letterSpacing: '1px', fontWeight: 'bold' }}>PER KILL</small>
              <h2 style={{ color: '#e67e22', margin: '6px 0 0 0' }}>₹{config.killReward}</h2>
            </div>
          </div>
        </div>

      </div>

      {/* Account Creation Modal */}
      {showAuthModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(5, 6, 10, 0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#0f111a', padding: '28px', borderRadius: '12px', width: '100%', maxWidth: '360px', border: '1px solid #d3540044', boxShadow: '0 8px 32px rgba(0,0,0,0.8)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: '#fff', letterSpacing: '1px' }}>JOIN TOURNAMENT</h3>
              <button onClick={() => setShowAuthModal(false)} style={{ background: 'none', border: 'none', color: '#888', fontSize: '18px', cursor: 'pointer' }}>✕</button>
            </div>

            {message && <p style={{ color: '#e74c3c', fontSize: '12px', textAlign: 'center' }}>{message}</p>}

            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%', padding: '12px', marginBottom: '12px', borderRadius: '6px', border: '1px solid #1a1d2e', backgroundColor: '#090a0f', color: '#fff', boxSizing: 'border-box' }}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%', padding: '12px', marginBottom: '12px', borderRadius: '6px', border: '1px solid #1a1d2e', backgroundColor: '#090a0f', color: '#fff', boxSizing: 'border-box' }}
            />
            <input
              type="text"
              placeholder="Free Fire IGN (In-Game Name)"
              value={inGameName}
              onChange={(e) => setInGameName(e.target.value)}
              style={{ width: '100%', padding: '12px', marginBottom: '20px', borderRadius: '6px', border: '1px solid #1a1d2e', backgroundColor: '#090a0f', color: '#fff', boxSizing: 'border-box' }}
            />

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => handleAuth('login')} disabled={loading} style={{ flex: 1, background: 'linear-gradient(135deg, #e67e22 0%, #d35400 100%)', color: '#fff', border: 'none', padding: '12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                LOG IN
              </button>
              <button onClick={() => handleAuth('signup')} disabled={loading} style={{ flex: 1, backgroundColor: '#1a1d2e', color: '#fff', border: 'none', padding: '12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                SIGN UP
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Support Footer */}
      <footer style={{ position: 'fixed', bottom: 0, left: 0, right: 0, backgroundColor: '#0d0e15', borderTop: '1px solid #1a1d2e', padding: '12px', textAlign: 'center', fontSize: '12px', color: '#6c6e7e' }}>
        Support WhatsApp: <strong style={{ color: '#e67e22' }}>{config.supportContact}</strong>
      </footer>
    </div>
  );
                                              }

