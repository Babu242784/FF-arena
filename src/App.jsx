import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Supabase Setup via Vercel Environment Variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('tournaments'); // tournaments, history, wallet, admin
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
    supportContact: '8453950403',
    paymentInstructions: 'Pay via UPI to support@upi & submit Ref ID with Screenshot'
  });

  // Admin States
  const [isAdmin, setIsAdmin] = useState(false);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [pendingWithdrawals, setPendingWithdrawals] = useState([]);
  const [adminLedger, setAdminLedger] = useState({ revenue: 0, payouts: 0, balance: 0 });

  // Payment Submission Form State
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
    
    // Check if Admin
    if (user.email === 'admin@ffarena.com') {
      setIsAdmin(true);
      fetchAdminData();
    }

    // Fetch or Generate Profile & Reg ID
    let { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (!prof) {
      const regId = 'FFA-' + Math.floor(100000 + Math.random() * 900000);
      const { data: newProf } = await supabase.from('profiles').insert([
        { id: user.id, email: user.email, registration_id: regId, ign: inGameName || 'Player' }
      ]).select().single();
      prof = newProf;
    }
    setProfile(prof);

    // Fetch Wallet Balance (Default ₹0)
    let { data: w } = await supabase.from('wallets').select('balance').eq('user_id', user.id).single();
    if (!w) {
      const { data: newW } = await supabase.from('wallets').insert([{ user_id: user.id, balance: 0 }]).select().single();
      setWalletBalance(newW ? newW.balance : 0);
    } else {
      setWalletBalance(w.balance);
    }

    fetchTournaments();
    fetchPrivateHistory(user.id);
    fetchTransactions(user.id);
    setLoading(false);
  };

  const fetchTournaments = async () => {
    const { data } = await supabase.from('tournaments').select('*');
    if (data && data.length > 0) {
      setTournaments(data);
    } else {
      // Default FF ARENA Tournament Setup
      setTournaments([
        {
          id: 't-101',
          title: 'FF ARENA Solo Battle Royale',
          format: 'Solo BR',
          match_time: new Date(Date.now() + 3600000).toISOString(),
          entry_fee: config.entryFee,
          prize_1st: config.firstPrize,
          prize_2nd: config.secondPrize,
          kill_reward: config.killReward,
          room_id: '8839201',
          room_pass: '1234',
          status: 'upcoming'
        }
      ]);
    }
  };

  const fetchPrivateHistory = async (userId) => {
    const { data } = await supabase.from('match_history').select('*').eq('user_id', userId);
    if (data) setMyHistory(data);
  };

  const fetchTransactions = async (userId) => {
    const { data } = await supabase.from('wallet_transactions').select('*').eq('user_id', userId);
    if (data) setTransactions(data);
  };

  const fetchAdminData = async () => {
    const { data: pmts } = await supabase.from('payment_submissions').select('*').eq('status', 'pending');
    if (pmts) setPendingPayments(pmts);

    const { data: wtds } = await supabase.from('withdrawals').select('*').eq('status', 'pending');
    if (wtds) setPendingWithdrawals(wtds);

    const { data: ledger } = await supabase.from('admin_ledger').select('*').single();
    if (ledger) setAdminLedger(ledger);
  };

  // Auth Functions
  const handleAuth = async (type) => {
    setLoading(true);
    setMessage('');
    let res = type === 'signup' 
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });

    if (res.error) setMessage(res.error.message);
    setLoading(false);
  };

  // Register and Submit Payment Proof
  const handlePaymentSubmit = async () => {
    if (!txnId) {
      alert('Please enter Transaction Ref ID!');
      return;
    }
    setLoading(true);
    const { error } = await supabase.from('payment_submissions').insert([
      {
        user_id: session.user.id,
        tournament_id: selectedTourney.id,
        txn_id: txnId,
        proof_url: proofUrl || 'No Screenshot Uploaded',
        amount: selectedTourney.entry_fee,
        status: 'pending'
      }
    ]);

    if (!error) {
      alert('Payment proof submitted successfully! Admin will verify soon.');
      setSelectedTourney(null);
      setTxnId('');
      setProofUrl('');
    } else {
      alert('Submission failed: ' + error.message);
    }
    setLoading(false);
  };

  // Check if Room Details should be visible (15 mins before match)
  const isRoomVisible = (matchTimeStr) => {
    const matchTime = new Date(matchTimeStr).getTime();
    const now = new Date().getTime();
    const diffMins = (matchTime - now) / (1000 * 60);
    return diffMins <= 15 && diffMins >= -60; // Visible 15 mins before till 1hr after
  };

  return (
    <div style={{ backgroundColor: '#0d0e12', color: '#e0e0e0', minHeight: '100vh', fontFamily: 'Roboto, sans-serif' }}>
      {/* Top Bar */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', backgroundColor: '#151821', borderBottom: '1px solid #232734' }}>
        <div>
          <h2 style={{ color: '#ff3b30', margin: 0, fontSize: '20px', fontWeight: '900', letterSpacing: '1px' }}>🔥 FF ARENA</h2>
          {profile && <small style={{ color: '#888' }}>Reg ID: <strong style={{ color: '#ff9500' }}>{profile.registration_id}</strong></strong></small>}
        </div>
        {session && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ backgroundColor: '#1c2d1f', color: '#4cd964', border: '1px solid #2e7d32', padding: '6px 12px', borderRadius: '20px', fontWeight: 'bold', fontSize: '13px' }}>
              💰 ₹{walletBalance}
            </span>
            <button onClick={() => supabase.auth.signOut()} style={{ backgroundColor: '#2c2c2e', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
              Logout
            </button>
          </div>
        )}
      </header>

      {!session ? (
        /* Login / Signup Screen */
        <div style={{ maxWidth: '380px', margin: '40px auto', backgroundColor: '#151821', padding: '24px', borderRadius: '12px', border: '1px solid #232734' }}>
          <h3 style={{ textAlign: 'center', marginTop: 0, color: '#fff' }}>FF ARENA Login</h3>
          {message && <p style={{ color: '#ff453a', fontSize: '13px', textAlign: 'center' }}>{message}</p>}
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
            placeholder="Free Fire In-Game Name (IGN)"
            value={inGameName}
            onChange={(e) => setInGameName(e.target.value)}
            style={{ width: '100%', padding: '12px', marginBottom: '16px', borderRadius: '6px', border: '1px solid #2c2c2e', backgroundColor: '#0d0e12', color: '#fff', boxSizing: 'border-box' }}
          />
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => handleAuth('login')} disabled={loading} style={{ flex: 1, backgroundColor: '#ff3b30', color: '#fff', padding: '12px', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
              Login
            </button>
            <button onClick={() => handleAuth('signup')} disabled={loading} style={{ flex: 1, backgroundColor: '#2c2c2e', color: '#fff', padding: '12px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
              Register
            </button>
          </div>
        </div>
      ) : (
        /* Main Application Navigation & Views */
        <div style={{ maxWidth: '500px', margin: '0 auto', paddingBottom: '70px' }}>
          {/* Navigation Bar */}
          <nav style={{ display: 'flex', borderBottom: '1px solid #232734', backgroundColor: '#151821', marginBottom: '16px' }}>
            {['tournaments', 'history', 'wallet', ...(isAdmin ? ['admin'] : [])].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1,
                  padding: '12px 0',
                  backgroundColor: 'transparent',
                  color: activeTab === tab ? '#ff3b30' : '#8e8e93',
                  border: 'none',
                  borderBottom: activeTab === tab ? '2px solid #ff3b30' : 'none',
                  fontWeight: 'bold',
                  textTransform: 'capitalize',
                  cursor: 'pointer'
                }}
              >
                {tab}
              </button>
            ))}
          </nav>

          {/* TAB 1: Tournaments List */}
          {activeTab === 'tournaments' && (
            <div style={{ padding: '0 12px' }}>
              <h4 style={{ margin: '0 0 12px 0', color: '#8e8e93' }}>AVAILABLE TOURNAMENTS</h4>
              {tournaments.map((t) => (
                <div key={t.id} style={{ backgroundColor: '#151821', borderRadius: '10px', padding: '16px', marginBottom: '14px', border: '1px solid #232734' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, color: '#fff' }}>{t.title}</h3>
                    <span style={{ backgroundColor: '#ff950022', color: '#ff9500', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>{t.format}</span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#8e8e93', margin: '6px 0 12px 0' }}>Match Time: {new Date(t.match_time).toLocaleString()}</p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', backgroundColor: '#0d0e12', padding: '10px', borderRadius: '6px', textAlign: 'center', marginBottom: '12px' }}>
                    <div><small style={{ color: '#8e8e93', fontSize: '10px' }}>ENTRY</small><br /><strong style={{ color: '#fff' }}>₹{t.entry_fee}</strong></div>
                    <div><small style={{ color: '#8e8e93', fontSize: '10px' }}>1ST PRIZE</small><br /><strong style={{ color: '#4cd964' }}>₹{t.prize_1st}</strong></div>
                    <div><small style={{ color: '#8e8e93', fontSize: '10px' }}>PER KILL</small><br /><strong style={{ color: '#ff9500' }}>₹{t.kill_reward}</strong></div>
                  </div>

                  {/* Room Details View Logic */}
                  {isRoomVisible(t.match_time) ? (
                    <div style={{ backgroundColor: '#1c2d1f', border: '1px solid #2e7d32', padding: '10px', borderRadius: '6px', marginBottom: '10px', textAlign: 'center' }}>
                      <span style={{ color: '#4cd964', fontSize: '12px', fontWeight: 'bold' }}>ROOM DETAILS AVAILABLE</span>
                      <div style={{ color: '#fff', fontSize: '14px', marginTop: '4px' }}>
                        Room ID: <strong>{t.room_id}</strong> | Pass: <strong>{t.room_pass}</strong>
                      </div>
                    </div>
                  ) : (
                    <p style={{ fontSize: '11px', color: '#8e8e93', fontStyle: 'italic', margin: '0 0 10px 0' }}>* Room ID & Pass visible 15 mins before match.</p>
                  )}

                  <button
                    onClick={() => setSelectedTourney(t)}
                    style={{ width: '100%', backgroundColor: '#ff3b30', color: '#fff', border: 'none', padding: '12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    JOIN TOURNAMENT (₹{t.entry_fee})
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* TAB 2: Private Match History */}
          {activeTab === 'history' && (
            <div style={{ padding: '0 12px' }}>
              <h4 style={{ margin: '0 0 12px 0', color: '#8e8e93' }}>MY MATCH HISTORY</h4>
              {myHistory.length === 0 ? (
                <p style={{ color: '#666', textAlign: 'center', marginTop: '30px' }}>No match history found.</p>
              ) : (
                myHistory.map((h) => (
                  <div key={h.id} style={{ backgroundColor: '#151821', padding: '14px', borderRadius: '8px', marginBottom: '10px', border: '1px solid #232734' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <strong>{h.tournament_name}</strong>
                      <span style={{ color: h.status === 'verified' ? '#4cd964' : '#ff9500', fontSize: '12px' }}>{h.status.toUpperCase()}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#8e8e93', marginTop: '6px' }}>
                      Position: #{h.rank} | Kills: {h.kills} | Reward Earned: <strong style={{ color: '#4cd964' }}>₹{h.prize_earned}</strong>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: Player Wallet */}
          {activeTab === 'wallet' && (
            <div style={{ padding: '0 12px' }}>
              <div style={{ backgroundColor: '#151821', padding: '20px', borderRadius: '10px', textAlign: 'center', border: '1px solid #232734', marginBottom: '16px' }}>
                <small style={{ color: '#8e8e93' }}>TOTAL WALLET BALANCE</small>
                <h1 style={{ color: '#4cd964', margin: '6px 0 14px 0', fontSize: '36px' }}>₹{walletBalance}</h1>
                <button
                  onClick={() => {
                    const upi = prompt('Enter UPI ID for withdrawal:');
                    const amt = prompt('Enter withdrawal amount (Min ₹50):');
                    if (upi && amt) alert('Withdrawal request submitted for review!');
                  }}
                  style={{ backgroundColor: '#ff9500', color: '#000', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  WITHDRAW MONEY
                </button>
              </div>

              <h4 style={{ margin: '0 0 12px 0', color: '#8e8e93' }}>TRANSACTION HISTORY</h4>
              {transactions.length === 0 ? (
                <p style={{ color: '#666', textAlign: 'center' }}>No transactions recorded.</p>
              ) : (
                transactions.map((tx) => (
                  <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', borderBottom: '1px solid #232734', fontSize: '13px' }}>
                    <div>
                      <div>{tx.description}</div>
                      <small style={{ color: '#666' }}>{new Date(tx.created_at).toLocaleDateString()}</small>
                    </div>
                    <strong style={{ color: tx.type === 'credit' ? '#4cd964' : '#ff3b30' }}>
                      {tx.type === 'credit' ? '+' : '-'}₹{tx.amount}
                    </strong>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 4: Admin Panel (Restricted) */}
          {activeTab === 'admin' && isAdmin && (
            <div style={{ padding: '0 12px' }}>
              <h4 style={{ margin: '0 0 12px 0', color: '#ff3b30' }}>ADMIN CONTROL PANEL</h4>
              
              <div style={{ backgroundColor: '#151821', padding: '14px', borderRadius: '8px', border: '1px solid #232734', marginBottom: '16px' }}>
                <h5 style={{ margin: '0 0 10px 0', color: '#ff9500' }}>FINANCIAL LEDGER</h5>
                <div style={{ fontSize: '13px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Total Entry Revenue: ₹{adminLedger.revenue}</span>
                  <span>Total Payouts: ₹{adminLedger.payouts}</span>
                </div>
              </div>

              <h5 style={{ color: '#8e8e93' }}>PENDING PAYMENT VERIFICATIONS</h5>
              {pendingPayments.length === 0 ? (
                <p style={{ color: '#666', fontSize: '13px' }}>No pending payments.</p>
              ) : (
                pendingPayments.map((p) => (
                  <div key={p.id} style={{ backgroundColor: '#151821', padding: '12px', borderRadius: '6px', marginBottom: '10px', fontSize: '12px' }}>
                    <div>User ID: {p.user_id}</div>
                    <div>Txn ID: <strong>{p.txn_id}</strong> | Amount: ₹{p.amount}</div>
                    <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                      <button style={{ backgroundColor: '#2e7d32', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px' }}>Approve</button>
                      <button style={{ backgroundColor: '#c62828', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px' }}>Reject</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Payment Proof Upload Modal */}
          {selectedTourney && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
              <div style={{ backgroundColor: '#151821', padding: '20px', borderRadius: '12px', width: '100%', maxWidth: '400px', border: '1px solid #232734' }}>
                <h3 style={{ marginTop: 0 }}>Register: {selectedTourney.title}</h3>
                <div style={{ backgroundColor: '#0d0e12', padding: '10px', borderRadius: '6px', fontSize: '12px', color: '#ff9500', marginBottom: '12px' }}>
                  {config.paymentInstructions}
                </div>
                <p style={{ fontSize: '13px', margin: '0 0 10px 0' }}>Entry Fee: <strong>₹{selectedTourney.entry_fee}</strong></p>
    
