import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Auth States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Application & Dashboard Tab States
  const [activeTab, setActiveTab] = useState('tournaments'); // 'tournaments', 'history', 'wallet', 'admin'
  const [tournaments, setTournaments] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [matchHistory, setMatchHistory] = useState([]);
  const [walletTxns, setWalletTxns] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [appSettings, setAppSettings] = useState({});

  // User Actions Form Input States
  const [regTxnId, setRegTxnId] = useState('');
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [paymentDetails, setPaymentDetails] = useState('');
  const [proofKills, setProofKills] = useState(0);
  const [proofPosition, setProofPosition] = useState(1);
  const [proofUrl, setProofUrl] = useState('');

  // Admin Specific States
  const [adminRegistrations, setAdminRegistrations] = useState([]);
  const [adminMatchProofs, setAdminMatchProofs] = useState([]);
  const [adminWithdrawals, setAdminWithdrawals] = useState([]);
  const [newTourn, setNewTourn] = useState({
    title: '',
    match_time: '',
    entry_fee: 10,
    first_prize: 100,
    second_prize: 60,
    kill_reward: 3
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchOrCreateProfile(session.user);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchOrCreateProfile(session.user);
      else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    fetchPublicData();
    if (session && profile) {
      fetchDashboardData();
      if (profile.role === 'admin') fetchAdminData();
    }
  }, [session, profile]);

  async function fetchOrCreateProfile(user) {
    setLoading(true);
    let { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();

    if (error && error.code === 'PGRST116') {
      const newName = user.user_metadata?.full_name || fullName || 'Player';
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert([{ id: user.id, full_name: newName }])
        .select()
        .single();

      if (!createError) data = newProfile;
    }

    setProfile(data);
    setLoading(false);
  }

  async function fetchPublicData() {
    const { data: tourns } = await supabase.from('tournaments').select('*').order('match_time', { ascending: true });
    const { data: settings } = await supabase.from('app_settings').select('*');
    setTournaments(tourns || []);

    const settingsMap = {};
    (settings || []).forEach(s => { settingsMap[s.key] = s.value; });
    setAppSettings(settingsMap);
  }

  async function fetchDashboardData() {
    if (!session?.user) return;
    const uid = session.user.id;

    const { data: regs } = await supabase.from('tournament_registrations').select('*, tournaments(*)').eq('player_id', uid);
    const { data: history } = await supabase.from('match_results').select('*, tournaments(*)').eq('player_id', uid).order('verified_at', { ascending: false });
    const { data: txns } = await supabase.from('wallet_transactions').select('*').eq('player_id', uid).order('created_at', { ascending: false });
    const { data: notifs } = await supabase.from('notifications').select('*').eq('player_id', uid).order('created_at', { ascending: false });

    setRegistrations(regs || []);
    setMatchHistory(history || []);
    setWalletTxns(txns || []);
    setNotifications(notifs || []);
  }

  async function fetchAdminData() {
    const { data: regs } = await supabase.from('tournament_registrations').select('*, tournaments(*), profiles(*)').order('registered_at', { ascending: false });
    const { data: proofs } = await supabase.from('match_results').select('*, tournaments(*), profiles(*)').order('created_at', { ascending: false });
    const { data: wds } = await supabase.from('withdrawal_requests').select('*, profiles(*)').order('created_at', { ascending: false });

    setAdminRegistrations(regs || []);
    setAdminMatchProofs(proofs || []);
    setAdminWithdrawals(wds || []);
  }

  const isRoomVisible = (matchTime, visibilityMins = 15) => {
    const diffInMs = new Date(matchTime) - new Date();
    const diffInMins = diffInMs / (1000 * 60);
    return diffInMins <= visibilityMins && diffInMins > -120;
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    setLoading(true);

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (error) setAuthError(error.message);
      else setShowAuthModal(false);
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setAuthError(error.message);
      else setShowAuthModal(false);
    }
    setLoading(false);
  };

  const handleTournamentRegister = async (tournamentId) => {
    if (!regTxnId) return alert('Please enter Transaction Reference ID.');
    const { error } = await supabase.from('tournament_registrations').insert([{
      tournament_id: tournamentId,
      player_id: session.user.id,
      payment_txn_id: regTxnId
    }]);

    if (error) alert(error.message);
    else {
      alert('Registration Submitted! Awaiting Admin Approval.');
      setRegTxnId('');
      setSelectedMatch(null);
      fetchDashboardData();
    }
  };

  const handleSubmitMatchProof = async (tournamentId) => {
    const { error } = await supabase.from('match_results').insert([{
      tournament_id: tournamentId,
      player_id: session.user.id,
      verified_kills: parseInt(proofKills),
      final_position: parseInt(proofPosition),
      proof_url: proofUrl,
      status: 'SUBMITTED'
    }]);

    if (error) alert(error.message);
    else {
      alert('Match proof submitted successfully!');
      setSelectedMatch(null);
      fetchDashboardData();
    }
  };

  const handleWithdrawalRequest = async () => {
    const amt = parseFloat(withdrawAmount);
    if (!amt || amt <= 0 || amt > (profile?.wallet_balance || 0)) {
      return alert('Invalid withdrawal amount or insufficient balance!');
    }

    const { error } = await supabase.from('withdrawal_requests').insert([{
      player_id: session.user.id,
      amount: amt,
      payment_details: paymentDetails
    }]);

    if (error) alert(error.message);
    else {
      alert('Withdrawal request submitted!');
      setWithdrawAmount('');
      setPaymentDetails('');
      fetchDashboardData();
    }
  };

  // Admin Actions
  const handleAdminApproveRegistration = async (regId) => {
    await supabase.from('tournament_registrations').update({ status: 'APPROVED' }).eq('id', regId);
    fetchAdminData();
  };

  const handleAdminVerifyResult = async (resultId, kills, position, prize) => {
    const { error } = await supabase.rpc('verify_match_result_and_credit', {
      p_result_id: resultId,
      p_kills: parseInt(kills),
      p_position: parseInt(position),
      p_prize: parseFloat(prize)
    });

    if (error) alert(error.message);
    else {
      alert('Result Verified and Wallet Credited!');
      fetchAdminData();
    }
  };

  const handleAdminCreateTournament = async () => {
    const { error } = await supabase.from('tournaments').insert([newTourn]);
    if (error) alert(error.message);
    else {
      alert('Tournament Created Successfully!');
      fetchPublicData();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-amber-500 flex flex-col items-center justify-center font-black tracking-widest text-lg">
        <div className="w-12 h-12 bg-amber-500 text-black flex items-center justify-center rounded-xl mb-3 animate-pulse text-2xl font-black">FF</div>
        LOADING FF ARENA...
      </div>
    );
  }

  // --- LANDING PAGE (UNAUTHENTICATED) ---
  if (!session) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white font-sans selection:bg-amber-500 selection:text-black">
        <nav className="flex items-center justify-between px-6 py-4 border-b border-neutral-800/80 bg-neutral-900/80 backdrop-blur sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-amber-500 rounded flex items-center justify-center font-black text-black text-xl shadow-lg shadow-amber-500/20">FF</div>
            <span className="font-black text-xl tracking-wider text-amber-500">FF ARENA</span>
          </div>
          <div className="hidden md:flex gap-6 text-xs font-extrabold tracking-wider text-neutral-400">
            <a href="#home" className="text-amber-500">HOME</a>
            <a href="#tournaments" className="hover:text-amber-500 transition">TOURNAMENTS</a>
            <a href="#how" className="hover:text-amber-500 transition">HOW IT WORKS</a>
            <a href="#rules" className="hover:text-amber-500 transition">RULES</a>
            <a href="#support" className="hover:text-amber-500 transition">SUPPORT</a>
          </div>
          <div className="flex gap-3">
            <button onClick={() => { setIsSignUp(false); setShowAuthModal(true); }} className="px-4 py-1.5 text-xs font-bold border border-neutral-700 rounded hover:border-amber-500 transition">LOGIN</button>
            <button onClick={() => { setIsSignUp(true); setShowAuthModal(true); }} className="px-4 py-1.5 text-xs font-bold bg-amber-500 text-black rounded hover:bg-amber-400 shadow-md shadow-amber-500/20 transition">SIGN UP</button>
          </div>
        </nav>

        <section id="home" className="relative px-6 py-16 max-w-5xl mx-auto text-center flex flex-col items-center">
          <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter text-amber-500 leading-none mb-2">
            ENTER THE <br/><span className="text-white">ARENA</span>
          </h1>
          <p className="text-neutral-400 max-w-md text-xs md:text-sm mb-6 uppercase tracking-wider font-semibold">Compete. Survive. Win. India's Ultimate Free Fire Tournaments</p>
          <div className="flex gap-4 mb-10">
            <button onClick={() => { setIsSignUp(false); setShowAuthModal(true); }} className="px-6 py-2.5 bg-amber-500 text-black font-extrabold rounded shadow-lg shadow-amber-500/20 hover:bg-amber-400 text-xs tracking-wider">LOGIN</button>
            <button onClick={() => { setIsSignUp(true); setShowAuthModal(true); }} className="px-6 py-2.5 border border-neutral-700 font-extrabold rounded bg-neutral-900/50 hover:border-amber-500 text-xs tracking-wider">SIGN UP</button>
          </div>
        </section>

        <section id="tournaments" className="max-w-5xl mx-auto px-6 py-8 border-t border-neutral-800/80">
          <h2 className="text-amber-500 font-black mb-4 tracking-wider text-xs uppercase">| UPCOMING TOURNAMENTS</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {tournaments.length === 0 ? (
              ['FF ARENA SOLO CUP', 'NIGHT HUNTER CUP', 'WEEKEND WARRIOR CUP'].map((title, i) => (
                <div key={i} className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-4 shadow-xl hover:border-amber-500/40 transition">
                  <p className="text-[10px] text-neutral-500 font-mono font-bold tracking-wider uppercase">SOLO BATTLE ROYALE</p>
                  <h3 className="font-extrabold text-amber-400 text-sm mb-3">{title}</h3>
                  <div className="flex justify-between items-end text-xs text-neutral-400 border-t border-neutral-800/80 pt-3">
                    <div>
                      <span className="text-[10px] text-neutral-500 font-bold block">ENTRY FEE</span>
                      <span className="text-white font-black">₹10</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-500 font-bold block">PRIZE POOL</span>
                      <span className="text-amber-400 font-black">₹100</span>
                    </div>
                    <button onClick={() => { setIsSignUp(false); setShowAuthModal(true); }} className="bg-amber-500 text-black px-3 py-1 font-black rounded text-[11px] hover:bg-amber-400">JOIN NOW</button>
                  </div>
                </div>
              ))
            ) : (
              tournaments.map((t) => (
                <div key={t.id} className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-4 shadow-xl hover:border-amber-500/40 transition">
                  <p className="text-[10px] text-neutral-500 font-mono font-bold tracking-wider uppercase">{t.game_mode}</p>
                  <h3 className="font-extrabold text-amber-400 text-sm mb-3">{t.title}</h3>
                  <div className="flex justify-between items-end text-xs text-neutral-400 border-t border-neutral-800/80 pt-3">
                    <div>
                      <span className="text-[10px] text-neutral-500 font-bold block">ENTRY FEE</span>
                      <span className="text-white font-black">₹{t.entry_fee}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-500 font-bold block">1ST PRIZE</span>
                      <span className="text-amber-400 font-black">₹{t.first_prize}</span>
                    </div>
                    <button onClick={() => { setIsSignUp(false); setShowAuthModal(true); }} className="bg-amber-500 text-black px-3 py-1 font-black rounded text-[11px] hover:bg-amber-400">JOIN NOW</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Auth Modal */}
        {showAuthModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl relative">
              <button onClick={() => setShowAuthModal(false)} className="absolute top-4 right-4 text-neutral-500 hover:text-white text-xl font-bold">&times;</button>

              <div className="text-center space-y-1 mb-6">
                <div className="w-10 h-10 bg-amber-500 text-black font-black text-xl flex items-center justify-center rounded-xl mx-auto shadow-lg shadow-amber-500/20">FF</div>
                <h2 className="text-lg font-black tracking-wider text-amber-500">FF ARENA</h2>
                <p className="text-xs text-neutral-400">{isSignUp ? 'Create your account' : 'Login to compete'}</p>
              </div>

              {authError && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3 rounded-lg text-center font-medium mb-4">
                  {authError}
                </div>
              )}

              <form onSubmit={handleAuth} className="space-y-3">
                {isSignUp && (
                  <div>
                    <label className="text-[10px] font-bold text-neutral-400 uppercase">Full Name</label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="In-game Name"
                      className="w-full mt-1 bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-bold text-neutral-400 uppercase">Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="player@esports.com"
                    className="w-full mt-1 bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-neutral-400 uppercase">Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full mt-1 bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase rounded-lg shadow-lg shadow-amber-500/10 tracking-wider transition mt-2"
                >
                  {isSignUp ? 'Create Account' : 'Login'}
                </button>
              </form>

              <div className="text-center pt-4 mt-4 border-t border-neutral-800">
                <button
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setAuthError('');
                  }}
                  className="text-xs text-neutral-400 hover:text-amber-500 font-semibold"
                >
                  {isSignUp ? 'Already have an account? Login' : "Don't have an account? Sign Up"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- DASHBOARD (AUTHENTICATED) ---
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans pb-24">
      <header className="sticky top-0 z-40 bg-neutral-900/90 backdrop-blur border-b border-neutral-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-black font-black text-xl shadow-md shadow-amber-500/20">
            FF
          </div>
          <div>
            <h1 className="font-black tracking-wider text-amber-500 text-base leading-tight">FF ARENA</h1>
            <p className="text-[10px] text-neutral-400 font-mono">ID: {profile?.registration_id || 'PLAYER'}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-neutral-950 border border-amber-500/30 px-3 py-1 rounded-full">
            <span className="text-xs font-extrabold text-amber-400">💰 ₹{profile?.wallet_balance || '0.00'}</span>
          </div>
          <button onClick={() => supabase.auth.signOut()} className="text-[10px] font-bold bg-neutral-800 hover:bg-red-500/20 hover:text-red-400 text-neutral-400 px-2.5 py-1 rounded border border-neutral-700 transition">
            Logout
          </button>
        </div>
      </header>

      <main className="p-4 max-w-lg mx-auto space-y-4">
        {/* Tab 1: Live & Upcoming Matches */}
        {activeTab === 'tournaments' && (
          <div className="space-y-4">
            <h2 className="text-xs font-black tracking-wider uppercase text-amber-500 flex items-center gap-2">
              🏆 Live & Upcoming Matches
            </h2>

            {tournaments.length === 0 ? (
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-8 text-center">
                <p className="text-xs text-neutral-500 font-semibold">Abhi koi match schedule nahi hua hai.</p>
              </div>
            ) : (
              tournaments.map((t) => {
                const userReg = registrations.find(r => r.tournament_id === t.id);
                const roomReady = isRoomVisible(t.match_time, t.room_visibility_minutes);

                return (
                  <div key={t.id} className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-xl hover:border-amber-500/40 transition">
                    <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent px-4 py-2 border-b border-neutral-800 flex justify-between items-center">
                      <span className="text-xs font-black uppercase text-amber-400 tracking-wider">{t.game_mode}</span>
                      <span className="text-[11px] font-mono font-bold text-neutral-400">{new Date(t.match_time).toLocaleString('en-IN', { timeStyle: 'short', dateStyle: 'short' })}</span>
                    </div>

                    <div className="p-4 space-y-3">
                      <h3 className="font-extrabold text-base text-neutral-100">{t.title}</h3>

                      <div className="grid grid-cols-3 gap-2 bg-neutral-950 p-2.5 rounded-lg border border-neutral-800/80 text-center">
                        <div>
                          <p className="text-[10px] text-neutral-500 uppercase font-bold">1st Prize</p>
                          <p className="text-xs font-black text-amber-400">₹{t.first_prize}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-neutral-500 uppercase font-bold">2nd Prize</p>
                          <p className="text-xs font-black text-neutral-300">₹{t.second_prize}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-neutral-500 uppercase font-bold">Per Kill</p>
                          <p className="text-xs font-black text-emerald-400">₹{t.kill_reward}</p>
                        </div>
                      </div>

                      {userReg?.status === 'APPROVED' && (
                        <div className="mt-3 p-3 rounded-lg border border-amber-500/30 bg-amber-500/5 space-y-1">
                          <div className="flex items-center justify-between text-xs font-bold text-amber-400">
                            <span>🔑 Room Credentials</span>
                            {!roomReady && <span className="text-[10px] text-neutral-400 font-normal">Unlocks 15m before match</span>}
                          </div>
                          {roomReady ? (
                            <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-neutral-950 p-2 rounded border border-neutral-800 mt-1">
                              <div><span className="text-neutral-500">ID:</span> <span className="text-white font-bold">{t.room_id || 'TBA'}</span></div>
                              <div><span className="text-neutral-500">PASS:</span> <span className="text-white font-bold">{t.room_password || 'TBA'}</span></div>
                            </div>
                          ) : (
                            <p className="text-[11px] text-neutral-400 italic">Protected. Match se 15 minute pehle auto-unlock hoga.</p>
                          )}
                        </div>
                      )}

                      <div className="pt-1 space-y-2">
                        {!userReg ? (
                          <button onClick={() => setSelectedMatch(t)} className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-black rounded-lg text-xs uppercase tracking-wider shadow-md shadow-amber-500/10 transition">
                            Register (Entry: ₹{t.entry_fee})
                          </button>
                        ) : (
                          <div className="flex items-center justify-between bg-neutral-950 px-3 py-2 rounded-lg border border-neutral-800">
                            <span className="text-xs text-neutral-400">Status:</span>
                            <span className={`text-xs font-extrabold uppercase ${userReg.status === 'APPROVED' ? 'text-emerald-400' : userReg.status === 'REJECTED' ? 'text-red-400' : 'text-amber-400'}`}>
                              {userReg.status}
                            </span>
                          </div>
                        )}

                        {userReg?.status === 'APPROVED' && (
                          <button onClick={() => setSelectedMatch({ ...t, isProofSubmit: true })} className="w-full py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-lg text-xs transition">
                            📸 Submit Match Result Proof
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Tab 2: Private Match History */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <h2 className="text-xs font-black tracking-wider uppercase text-amber-500 flex items-center gap-2">
              🎖️ Private Match History
            </h2>

            {matchHistory.length === 0 && registrations.length === 0 ? (
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-8 text-center">
                <p className="text-xs text-neutral-500 font-semibold">Koi registration nahi mili.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {matchHistory.map(m => (
                  <div key={m.id} className="bg-neutral-900 border border-neutral-800 p-3.5 rounded-xl flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-xs text-neutral-200">{m.tournaments?.title}</h4>
                      <p className="text-[10px] text-neutral-500 font-mono mt-0.5">{new Date(m.verified_at || m.created_at).toLocaleDateString()} | Rank: #{m.final_position} | Kills: {m.verified_kills}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-xs text-amber-400">+₹{m.prize_earned}</p>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{m.status}</span>
                    </div>
                  </div>
                ))}

                {registrations.filter(r => !matchHistory.some(m => m.tournament_id === r.tournament_id)).map(reg => (
                  <div key={reg.id} className="bg-neutral-900 border border-neutral-800 p-3.5 rounded-xl flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-xs text-neutral-200">{reg.tournaments?.title}</h4>
                      <p className="text-[10px] text-neutral-500 font-mono mt-0.5">{new Date(reg.registered_at).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${reg.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-neutral-800 text-neutral-400'}`}>
                        {reg.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Wallet & Withdrawals */}
        {activeTab === 'wallet' && (
          <div className="space-y-4">
            <div className="bg-neutral-900 p-5 rounded-xl border border-amber-500/30 text-center space-y-2 shadow-xl">
              <p className="text-[11px] text-neutral-400 uppercase font-extrabold tracking-wider">Available Balance</p>
              <p className="text-3xl font-black text-amber-400">₹{profile?.wallet_balance || '0.00'}</p>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl space-y-3">
              <h3 className="text-xs font-black text-amber-500 uppercase tracking-wider">Submit Withdrawal Request</h3>
              <input type="number" placeholder="Amount (₹)" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-amber-500" />
              <input type="text" placeholder="UPI ID / PhonePe / Bank Account" value={paymentDetails} onChange={(e) => setPaymentDetails(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-amber-500" />
              <button onClick={handleWithdrawalRequest} className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-black rounded-lg text-xs uppercase tracking-wider transition">
                Withdraw Funds
              </button>
            </div>

            <h3 className="text-[11px] font-black text-neutral-400 uppercase tracking-wider pt-2">Transaction Ledger</h3>
            <div className="space-y-2">
              {walletTxns.length === 0 ? (
                <p className="text-xs text-neutral-500 text-center py-4">Koi transactions nahi hain.</p>
              ) : (
                walletTxns.map(txn => (
                  <div key={txn.id} className="bg-neutral-900 border border-neutral-800 p-3 rounded-lg flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-neutral-200">{txn.description}</p>
                      <p className="text-[10px] text-neutral-500">{new Date(txn.created_at).toLocaleString()}</p>
                    </div>
                    <span className={`font-mono font-bold ${txn.amount > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {txn.amount > 0 ? `+₹${txn.amount}` : `-₹${Math.abs(txn.amount)}`}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Admin Panel */}
        {activeTab === 'admin' && profile?.role === 'admin' && (
          <div className="space-y-6">
            <h2 className="text-xs font-black tracking-wider uppercase text-amber-500">🛡️ Admin Management Panel</h2>

            <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl space-y-3">
              <h3 className="text-xs font-bold text-white">Create New Tournament</h3>
              <input type="text" placeholder="Tournament Title" value={newTourn.title} onChange={e => setNewTourn({ ...newTourn, title: e.target.value })} className="w-full bg-neutral-950 border border-neutral-800 p-2 text-xs text-white rounded" />
              <input type="datetime-local" value={newTourn.match_time} onChange={e => setNewTourn({ ...newTourn, match_time: e.target.value })} className="w-full bg-neutral-950 border border-neutral-800 p-2 text-xs text-white rounded" />
              <button onClick={handleAdminCreateTournament} className="w-full py-2 bg-amber-500 text-black font-bold text-xs rounded">Publish Tournament</button>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-bold text-white">Pending Registrations</h3>
              {adminRegistrations.filter(r => r.status === 'PENDING').map(r => (
                <div key={r.id} className="bg-neutral-900 border border-neutral-800 p-3 rounded-lg flex justify-between items-center text-xs">
                  <div>
                    <p className="font-bold text-white">{r.profiles?.full_name} ({r.profiles?.registration_id})</p>
                    <p className="text-[10px] text-neutral-400">Txn: {r.payment_txn_id}</p>
                  </div>
                  <button onClick={() => handleAdminApproveRegistration(r.id)} className="px-3 py-1 bg-emerald-500 text-black font-bold rounded">Approve</button>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-bold text-white">Pending Result Proofs</h3>
              {adminMatchProofs.filter(p => p.status === 'SUBMITTED').map(p => (
                <div key={p.id} className="bg-neutral-900 border border-neutral-800 p-3 rounded-lg space-y-2 text-xs">
                  <p className="font-bold text-white">{p.profiles?.full_name} - Kills: {p.verified_kills}, Rank: #{p.final_position}</p>
                  <p className="text-[10px] text-amber-400 underline">{p.proof_url}</p>
                  <button onClick={() => handleAdminVerifyResult(p.id, p.verified_kills, p.final_position, 100)} className="w-full py-1.5 bg-amber-500 text-black font-bold rounded">Verify & Credit Reward</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Registration & Proof Modal */}
      {selectedMatch && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-neutral-800 pb-2">
              <h3 className="font-black text-amber-500 text-sm">{selectedMatch.isProofSubmit ? 'Submit Match Result' : 'Tournament Registration'}</h3>
              <button onClick={() => setSelectedMatch(null)} className="text-neutral-400 font-bold">&times;</button>
            </div>

            {!selectedMatch.isProofSubmit ? (
              <div className="space-y-3">
                <p className="text-xs text-neutral-300">{appSettings.payment_instructions || 'Pay fee via UPI and enter transaction ID below.'}</p>
                <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800 text-xs">
                  <p className="text-neutral-400">Entry Fee: <span className="text-white font-bold">₹{selectedMatch.entry_fee}</span></p>
                </div>
                <input
                  type="text"
                  placeholder="Transaction Reference / Txn ID"
                  value={regTxnId}
                  onChange={(e) => setRegTxnId(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                />
                <button onClick={() => handleTournamentRegister(selectedMatch.id)} className="w-full py-2.5 bg-amber-500 text-black font-black rounded-lg text-xs uppercase">Submit Registration</button>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-neutral-400">VERIFIED KILLS</label>
                  <input type="number" value={proofKills} onChange={(e) => setProofKills(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-xs text-white" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-neutral-400">FINAL POSITION / RANK</label>
                  <input type="number" value={proofPosition} onChange={(e) => setProofPosition(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-xs text-white" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-neutral-400">SCREENSHOT / PROOF URL</label>
                  <input type="text" placeholder="https://..." value={proofUrl} onChange={(e) => setProofUrl(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-xs text-white" />
                </div>
                <button onClick={() => handleSubmitMatchProof(selectedMatch.id)} className="w-full py-2.5 bg-amber-500 text-black font-black rounded-lg text-xs uppercase">Submit Proof</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom Fixed Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-neutral-900/95 backdrop-blur border-t border-neutral-800 py-2 px-6 flex justify-around items-center z-40">
        <button onClick={() => setActiveTab('tournaments')} className={`flex flex-col items-center gap-1 ${activeTab === 'tournaments' ? 'text-amber-500' : 'text-neutral-500'}`}>
          <span className="text-base">🏆</span>
          <span className="text-[10px] font-bold">Matches</span>
        </button>
        <button onClick={() => setActiveTab('history')} className={`flex flex-col items-center gap-1 ${activeTab === 'history' ? 'text-amber-500' : 'text-neutral-500'}`}>
          <span className="text-base">🎖️</span>
          <span className="text-[10px] font-bold">History</span>
        </button>
        <button onClick={() => setActiveTab('wallet')} className={`flex flex-col items-center gap-1 ${activeTab === 'wallet' ? 'text-amber-500' : 'text-neutral-500'}`}>
          <span className="text-base">👛</span>
          <span className="text-[10px] font-bold">Wallet</span>
        </button>
        {profile?.role === 'admin' && (
          <button onClick={() => setActiveTab('admin')} className={`flex flex-col items-center gap-1 ${activeTab === 'admin' ? 'text-amber-500' : 'text-neutral-500'}`}>
            <span className="text-base">🛡️</span>
            <span className="text-[10px] font-bold">Admin</span>
          </button>
        )}
      </nav>
    </div>
  );
                                                   }
                
