import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

export default function App() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [profile, setProfile] = useState(null);
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
    });

    fetchTournaments();
  }, []);

  async function fetchProfile(userId) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data) setProfile(data);
  }

  async function fetchTournaments() {
    const { data } = await supabase.from('tournaments').select('*');
    if (data) setTournaments(data);
  }

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ email });
    setLoading(false);
    if (error) alert('Error: ' + error.message);
    else alert('Login OTP / Magic link aapke email par bhej diya gaya hai!');
  }

  async function handleJoin(tournamentId, entryFee) {
    if (!user) return alert("Pehle login karein!");
    if ((profile?.wallet_balance || 0) < entryFee) {
      return alert("Aapke wallet mein balance kam hai!");
    }

    const newBalance = profile.wallet_balance - entryFee;
    await supabase.from('profiles').update({ wallet_balance: newBalance }).eq('id', user.id);
    await supabase.from('admin_ledger').insert([{ amount: entryFee, type: 'ENTRY_FEE' }]);

    setProfile({ ...profile, wallet_balance: newBalance });
    alert("Match registration successful!");
  }

  return (
    <div style={{ padding: '20px', backgroundColor: '#121212', color: '#fff', minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>
      
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333', paddingBottom: '15px' }}>
        <h2 style={{ color: '#ff4757', margin: 0 }}>🔥 FF ARENA</h2>
        {user && (
          <div style={{ background: '#2ed573', padding: '6px 14px', borderRadius: '20px', color: '#000', fontWeight: 'bold' }}>
            Wallet: ₹{profile?.wallet_balance || 0}
          </div>
        )}
      </header>

      {!user ? (
        <div style={{ marginTop: '40px', background: '#1e1e1e', padding: '25px', borderRadius: '10px', maxWidth: '400px', margin: '40px auto' }}>
          <h3 style={{ marginTop: 0, textAlign: 'center' }}>Login to Register</h3>
          <form onSubmit={handleLogin}>
            <input 
              type="email" 
              placeholder="Enter Email Address" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              style={{ width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '6px', border: '1px solid #444', background: '#2b2b2b', color: '#fff', boxSizing: 'border-box' }}
              required 
            />
            <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', background: '#ff4757', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
              {loading ? 'Sending OTP...' : 'Send Login OTP'}
            </button>
          </form>
        </div>
      ) : (
        <div style={{ marginTop: '30px', maxWidth: '600px', margin: '30px auto' }}>
          <h3>Available Matches</h3>
          {tournaments.length === 0 ? <p style={{ color: '#aaa' }}>Filhal koi match available nahi hai.</p> : null}
          {tournaments.map((t) => (
            <div key={t.id} style={{ background: '#1e1e1e', padding: '20px', borderRadius: '10px', marginBottom: '15px', border: '1px solid #333' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '18px' }}>{t.title}</h4>
              <p style={{ margin: '5px 0', color: '#ccc' }}>Entry Fee: <strong style={{ color: '#2ed573' }}>₹{t.entry_fee}</strong></p>
              
              {t.room_id ? (
                <div style={{ background: '#222', padding: '12px', borderRadius: '6px', marginTop: '12px', color: '#2ed573', fontWeight: 'bold' }}>
                  🎮 Room ID: {t.room_id} | Pass: {t.room_password}
                </div>
              ) : (
                <button 
                  onClick={() => handleJoin(t.id, t.entry_fee)}
                  style={{ background: '#2ed573', color: '#000', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', marginTop: '12px' }}>
                  Join Match (₹{t.entry_fee})
                </button>
              )}
            </div>
          ))}
        </div>
      )}

    </div>
  );
  }
  
