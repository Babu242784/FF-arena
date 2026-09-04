import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('tournaments');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Auth States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inGameName, setInGameName] = useState('');

  // Data States
  const [walletBalance, setWalletBalance] = useState(0);
  const [tournaments, setTournaments] = useState([]);
  const [myHistory, setMyHistory] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [config, setConfig] = useState({
    entryFee: 10,
    firstPrize: 100,
    secondPrize: 50,
    killReward: 3,
    supportContact: '8453950403'
  });

  // Admin States
  const [isAdmin, setIsAdmin] = useState(false);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [selectedTourney, setSelectedTourney] = useState(null);
  const [txnId, setTxnId] = useState('');
  const [proofUrl, setProofUrl] = useState('');

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
    if (user.email === 'admin@ffarena.com') setIsAdmin(true);

    let { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (!prof) {
      const regId = 'FFA-' + Math.floor(100000 + Math.random() * 900000);
      const { data: newProf } = await supabase.from('profiles').insert([
        { id: user.id, email: user.email, registration_id: regId, ign: inGameName || 'Player' }
      ]).select().single();
      prof = newProf;
    }
    setProfile(prof);

    let { data: w } = await supabase.from('wallets').select('balance').eq('user_id', user.id).single();
    setWalletBalance(w ? w.balance : 0);

    fetchTournaments();
    setLoading(false);
  };

  const fetchTournaments = async () => {
    const { data } = await supabase.from('tournaments').select('*');
    if (data && data.length > 0) setTournaments(data);
    else {
      setTournaments([
        {
          id: 't-101',
          title: 'FF ARENA Mega Solo BR',
          format: 'Solo Battle Royale',
          match_time: new Date(Date.now() + 3600000).toISOString(),
          entry_fee: config.entryFee,
          prize_1st: config.firstPrize,
          prize_2nd: config.secondPrize,
          kill_reward: config.killReward,
          room_id: '8839201',
          room_pass: '1234'
        }
      ]);
    }
  };

  const handleAuth = async (type) => {
    setLoading(true);
    setMessage('');
    let res = type === 'signup' 
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });

    if (res.error) setMessage(res.error.message);
    setLoading(false);
  };

  const handlePaymentSubmit = async () => {
    if (!txnId) return alert('Transaction Ref ID zaroori hai!');
    setLoading(true);
    const { error } = await supabase.from('payment_submissions').insert([
      {
        user_id: session.user.id,
        tournament_id: selectedTourney.id,
        txn_id: txnId,
        proof_url: proofUrl || 'No Proof',
        amount: selectedTourney.entry_fee,
        status: 'pending'
      }
    ]);

    if (!error) {
      alert('Payment proof submit ho gaya hai! Admin verify karke approve karega.');
      setSelectedTourney(null);
      setTxnId('');
    } else {
      alert('Error: ' + error.message);
    }
    setLoading(false);
  };

  return (
    <div style={{ backgroundColor: '#0d0e12', color: '#e0e0e0', minHeight: '100vh', fontFamily: 'Roboto, sans-serif' }}>
      {/* Top Navigation */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', backgroundColor: '#151821', borderBottom: '1px solid #232734' }}>
        <h2 style={{ color: '#ff3b30', margin: 0, fontSize: '22px', fontWeight: '900', letterSpacing: '1px' }}>🔥 FF ARENA</h2>
        {session && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ backgroundColor: '#1c2d1f', color: '#4cd964', border: '1px solid #2e7d32', padding: '6px 12px', borderRadius: '20px', fontWeight: 'bold' }}>
              💰 ₹{walletBalance}
            </span>
            <button onClick={() => supabase.auth.signOut()} style={{ backgroundColor: '#2c2c2e', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' }}>Logout</button>
          </div>
        )}
      </header>

      {/* PUBLIC LANDING PAGE (Unauthenticated Users) */}
      {!session ? (
        <div style={{ maxWidth: '1000px', margin: '20px auto', padding: '0 16px' }}>
          
          {/* Main Hero Banner */}
          <div style={{ background: 'linear-gradient(135deg, #1f0808 0%, #151821 100%)', padding: '24px', borderRadius: '16px', border: '1px solid #ff3b3044', textAlign: 'center', marginBottom: '24px' }}>
            <h1 style={{ color: '#fff', margin: '0 0 8px 0', fontSize: '28px', textTransform: 'uppercase' }}>Daily Free Fire Esports Tournament</h1>
            <p style={{ color: '#ff9500', margin: '0 0 20px 0', fontWeight: 'bold' }}>Khelie, Kills Baniye Aur Cash Prizes Jeetie!</p>

            {/* Prize & Fee Highlights Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', maxWidth: '700px', margin: '0 auto' }}>
              <div style={{ backgroundColor: '#0d0e12', padding: '14px', borderRadius: '10px', border: '1px solid #232734' }}>
                <small style={{ color: '#8e8e93' }}>ENTRY FEE</small>
                <h2 style={{ color: '#fff', margin: '4px 0 0 0' }}>₹{config.entryFee}</h2>
              </div>
              <div style={{ backgroundColor: '#0d0e12', padding: '14px', borderRadius: '10px', border: '1px solid #4cd96444' }}>
                <small style={{ color: '#4cd964' }}>1ST PRIZE</small>
                <h2 style={{ color: '#4cd964', margin: '4px 0 0 0' }}>₹{config.firstPrize}</h2>
              </div>
              <div style={{ backgroundColor: '#0d0e12', padding: '14px', borderRadius: '10px', border: '1px solid #232734' }}>
                <small style={{ color: '#8e8e93' }}>2ND PRIZE</small>
                <h2 style={{ color: '#fff', margin: '4px 0 0 0' }}>₹{config.secondPrize}</h2>
              </div>
              <div style={{ backgroundColor: '#0d0e12', padding: '14px', borderRadius: '10px', border: '1px solid #ff950044' }}>
                <small style={{ color: '#ff9500' }}>PER KILL</small>
                <h2 style={{ color: '#ff9500', margin: '4px 0 0 0' }}>₹{config.killReward}</h2>
              </div>
            </div>
          </div>

          {/* Side-by-Side Content Section */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            
            {/* Left: Rules & Information */}
            <div style={{ backgroundColor: '#151821', padding: '20px', borderRadius: '12px', border: '1px solid #232734' }}>
              <h3 style={{ color: '#ff3b30', marginTop: 0 }}>📌 Rules & Features</h3>
              <ul style={{ color: '#ccc', paddingLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
                <li>Room ID aur Password match hone se <strong>15 minute pehle</strong> dashboard par dikhega.</li>
                <li>Har valid kill par <strong>₹{config.killReward}</strong> turant add honge.</li>
                <li>Withdrawal request 24 ghante ke andar UPI par process hoti hai.</li>
                <li>Kisi bhi problem ke liye Support Number: <strong>{config.supportContact}</strong></li>
              </ul>
            </div>

            {/* Right: Direct Login / Registration Box */}
            <div style={{ backgroundColor: '#151821', padding: '20px', borderRadius: '12px', border: '1px solid #ff3b3066' }}>
              <h3 style={{ color: '#fff', marginTop: 0, textAlign: 'center' }}>Join Tournament Now</h3>
              {message && <p style={{ color: '#ff453a', fontSize: '12px', textAlign: 'center' }}>{message}</p>}
              
              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: '100%', padding: '12px', marginBottom: '10px', borderRadius: '6px', border: '1px solid #2c2c2e', backgroundColor: '#0d0e12', color: '#fff', boxSizing: 'border-box' }}
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: '100%', padding: '12px', marginBottom: '10px', borderRadius: '6px', border: '1px solid #2c2c2e', backgroundColor: '#0d0e12', color: '#fff', boxSizing: 'border-box' }}
              />
              <input
                type="text"
                placeholder="Free Fire IGN (Name)"
                value={inGameName}
                onChange={(e) => setInGameName(e.target.value)}
                style={{ width: '100%', padding: '12px', marginBottom: '16px', borderRadius: '6px', border: '1px solid #2c2c2e', backgroundColor: '#0d0e12', color: '#fff', boxSizing: 'border-box' }}
              />

              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => handleAuth('login')} disabled={loading} style={{ flex: 1, backgroundColor: '#ff3b30', color: '#fff', padding: '12px', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                  LOG IN
                </button>
                <button onClick={() => handleAuth('signup')} disabled={loading} style={{ flex: 1, backgroundColor: '#2c2c2e', color: '#fff', padding: '12px', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                  SIGN UP
                </button>
              </div>
            </div>

          </div>
        </div>
      ) : (
        /* LOGGED IN DASHBOARD */
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '16px', paddingBottom: '70px' }}>
          <h3 style={{ color: '#fff' }}>Welcome, {profile?.ign || 'Player'}</h3>
          <p style={{ color: '#8e8e93', fontSize: '13px' }}>Your Reg ID: <strong style={{ color: '#ff9500' }}>{profile?.registration_id}</strong></p>

          <h4 style={{ color: '#8e8e93', marginTop: '20px' }}>AVAILABLE TOURNAMENTS</h4>
          {tournaments.map((t) => (
            <div key={t.id} style={{ backgroundColor: '#151821', borderRadius: '10px', padding: '16px', marginBottom: '14px', border: '1px solid #232734' }}>
              <h3>{t.title}</h3>
              <p style={{ fontSize: '13px', color: '#8e8e93' }}>Entry Fee: ₹{t.entry_fee} | 1st Prize: ₹{t.prize_1st} | Kill: ₹{t.kill_reward}</p>
              <button
                onClick={() => setSelectedTourney(t)}
                style={{ width: '100%', backgroundColor: '#ff3b30', color: '#fff', border: 'none', padding: '12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                JOIN NOW (₹{t.entry_fee})
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Payment Modal */}
      {selectedTourney && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: '#151821', padding: '20px', borderRadius: '12px', width: '100%', maxWidth: '400px', border: '1px solid #232734' }}>
            <h3>Register for {selectedTourney.title}</h3>
            <p style={{ fontSize: '13px', color: '#ff9500' }}>Pay ₹{selectedTourney.entry_fee} to UPI ID and enter Transaction ID below.</p>
            <input
              type="text"
              placeholder="UPI Ref / Transaction ID"
              value={txnId}
              onChange={(e) => setTxnId(e.target.value)}
              style={{ width: '100%', padding: '10px', marginBottom: '12px', borderRadius: '6px', border: '1px solid #2c2c2e', backgroundColor: '#0d0e12', color: '#fff', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={handlePaymentSubmit} disabled={loading} style={{ flex: 1, backgroundColor: '#4cd964', color: '#000', padding: '10px', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Submit</button>
              <button onClick={() => setSelectedTourney(null)} style={{ flex: 1, backgroundColor: '#2c2c2e', color: '#fff', padding: '10px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <footer style={{ position: 'fixed', bottom: 0, left: 0, right: 0, backgroundColor: '#151821', borderTop: '1px solid #232734', padding: '10px', textAlign: 'center', fontSize: '12px', color: '#8e8e93' }}>
        Support WhatsApp: <strong style={{ color: '#ff9500' }}>{config.supportContact}</strong>
      </footer>
    </div>
  );
}
