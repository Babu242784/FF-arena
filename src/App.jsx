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

  // Dashboard Tab State
  const [activeTab, setActiveTab] = useState('tournaments');
  const [tournaments, setTournaments] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [walletTxns, setWalletTxns] = useState([]);
  const [notifications, setNotifications] = useState([]);

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
    if (session && profile) {
      fetchDashboardData();
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

  async function fetchDashboardData() {
    if (!session?.user) return;
    
    const { data: tourns } = await supabase.from('tournaments').select('*').order('match_time', { ascending: true });
    const { data: regs } = await supabase.from('tournament_registrations').select('*, tournaments(*)').eq('player_id', session.user.id);
    const { data: txns } = await supabase.from('wallet_transactions').select('*').eq('player_id', session.user.id).order('created_at', { ascending: false });
    const { data: notifs } = await supabase.from('notifications').select('*').eq('player_id', session.user.id).order('created_at', { ascending: false });

    setTournaments(tourns || []);
    setRegistrations(regs || []);
    setWalletTxns(txns || []);
    setNotifications(notifs || []);
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
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setAuthError(error.message);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-amber-500 flex flex-col items-center justify-center font-black tracking-widest text-lg">
        <div className="w-12 h-12 bg-amber-500 text-black flex items-center justify-center rounded-xl mb-3 animate-pulse text-2xl font-black">FF</div>
        LOADING FF ARENA...
      </div>
    );
  }

  // --- LANDING PAGE (UNAUTHENTICATED) ---
  if (!session) {
    return (
      <div className="min-h-screen bg-[#0d0e12] text-white font-sans selection:bg-amber-500 selection:text-black">
        {/* Top Header */}
        <nav className="flex items-center justify-between px-8 py-4 border-b border-neutral-800/80 bg-[#12141a]/90 backdrop-blur sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-500 rounded-lg flex items-center justify-center font-black text-black text-xl shadow-lg shadow-amber-500/20">FF</div>
            <span className="font-black text-2xl tracking-wider text-white">FF <span className="text-amber-500">ARENA</span></span>
          </div>
          <div className="hidden md:flex gap-8 text-xs font-black tracking-widest text-neutral-400 uppercase">
            <a href="#home" className="text-amber-500">Home</a>
            <a href="#tournaments" className="hover:text-amber-500 transition">Tournaments</a>
            <a href="#how" className="hover:text-amber-500 transition">How It Works</a>
            <a href="#rules" className="hover:text-amber-500 transition">Rules</a>
            <a href="#support" className="hover:text-amber-500 transition">Support</a>
          </div>
          <div className="flex gap-3">
            <button onClick={() => { setIsSignUp(false); setShowAuthModal(true); }} className="px-5 py-2 text-xs font-black tracking-wider border border-neutral-700 rounded-lg hover:border-amber-500 transition">LOGIN</button>
            <button onClick={() => { setIsSignUp(true); setShowAuthModal(true); }} className="px-5 py-2 text-xs font-black tracking-wider bg-amber-500 text-black rounded-lg hover:bg-amber-400 shadow-lg shadow-amber-500/20 transition">SIGN UP</button>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="relative px-6 py-20 max-w-6xl mx-auto text-center flex flex-col items-center justify-center min-h-[60vh] bg-gradient-to-b from-amber-500/5 via-transparent to-transparent">
          <h1 className="text-6xl md:text-8xl font-black italic tracking-tighter text-white leading-none mb-4 uppercase drop-shadow-2xl">
            ENTER THE <br/><span className="text-amber-500 drop-shadow-[0_5px_15px_rgba(245,158,11,0.4)]">ARENA</span>
          </h1>
          <p className="text-neutral-400 max-w-lg text-xs md:text-sm mb-8 uppercase tracking-widest font-bold">Compete. Survive. Win. India's Ultimate Free Fire Tournaments</p>
          <div className="flex gap-4">
            <button onClick={() => { setIsSignUp(false); setShowAuthModal(true); }} className="px-8 py-3 bg-amber-500 text-black font-black rounded-lg shadow-xl shadow-amber-500/20 hover:bg-amber-400 text-xs tracking-widest uppercase transition">LOGIN</button>
            <button onClick={() => { setIsSignUp(true); setShowAuthModal(true); }} className="px-8 py-3 border border-neutral-700 font-black rounded-lg bg-neutral-900/60 hover:border-amber-500 text-xs tracking-widest uppercase transition">SIGN UP</button>
          </div>
        </section>

        {/* Upcoming Tournaments Grid */}
        <section className="max-w-6xl mx-auto px-6 py-12 border-t border-neutral-800/80">
          <h2 className="text-amber-500 font-black mb-6 tracking-widest text-xs uppercase flex items-center gap-2">
            <span className="w-1 h-4 bg-amber-500 inline-block"></span> UPCOMING TOURNAMENTS
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {['FF ARENA SOLO CUP', 'NIGHT HUNTER CUP', 'WEEKEND WARRIOR CUP'].map((title, i) => (
              <div key={i} className="bg-[#12141a] border border-neutral-800/80 rounded-xl p-5 shadow-2xl hover:border-amber-500/50 transition">
                <p className="text-[10px] text-neutral-500 font-mono font-black tracking-widest uppercase mb-1">SOLO BATTLE ROYALE</p>
                <h3 className="font-black text-amber-400 text-base mb-4 tracking-wide">{title}</h3>
                
                <div className="grid grid-cols-3 gap-2 bg-[#0a0b0e] p-3 rounded-lg border border-neutral-800/80 text-center mb-4">
                  <div>
                    <span className="text-[9px] text-neutral-500 font-bold block uppercase">ENTRY FEE</span>
                    <span className="text-white font-black text-xs">₹10</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-neutral-500 font-bold block uppercase">PRIZE POOL</span>
                    <span className="text-amber-400 font-black text-xs">₹100</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-neutral-500 font-bold block uppercase">STARTS IN</span>
                    <span className="text-neutral-300 font-bold text-[10px]">02h : 30m</span>
                  </div>
                </div>

                <button onClick={() => { setIsSignUp(false); setShowAuthModal(true); }} className="w-full bg-amber-500 text-black py-2.5 font-black rounded-lg text-xs hover:bg-amber-400 tracking-wider uppercase transition">
                  JOIN NOW
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Auth Modal */}
        {showAuthModal && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <div className="w-full max-w-sm bg-[#12141a] border border-neutral-800 rounded-2xl p-6 shadow-2xl relative">
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
                      className="w-full mt-1 bg-[#0a0b0e] border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
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
                    className="w-full mt-1 bg-[#0a0b0e] border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
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
                    className="w-full mt-1 bg-[#0a0b0e] border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
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

  // --- DASHBOARD (AUTHENTICATED - Reference Screenshot Design) ---
  return (
    <div className="min-h-screen bg-[#0a0b0e] text-neutral-100 font-sans flex flex-col md:flex-row">
      
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-[#12141a] border-r border-neutral-800/80 p-5 flex flex-col justify-between shrink-0">
        <div>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-9 h-9 rounded-lg bg-amber-500 flex items-center justify-center text-black font-black text-xl shadow-lg shadow-amber-500/20">
              FF
            </div>
            <div>
              <h1 className="font-black tracking-wider text-white text-lg leading-tight">FF <span className="text-amber-500">ARENA</span></h1>
            </div>
          </div>

          <nav className="space-y-1.5 font-extrabold text-xs tracking-wider">
            <button 
              onClick={() => setActiveTab('tournaments')} 
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${activeTab === 'tournaments' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/30' : 'text-neutral-400 hover:bg-neutral-800/50'}`}
            >
              <span>🏠</span> HOME / MATCHES
            </button>
            <button 
              onClick={() => setActiveTab('history')} 
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${activeTab === 'history' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/30' : 'text-neutral-400 hover:bg-neutral-800/50'}`}
            >
              <span>🎮</span> MY MATCHES
            </button>
            <button 
              onClick={() => setActiveTab('wallet')} 
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${activeTab === 'wallet' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/30' : 'text-neutral-400 hover:bg-neutral-800/50'}`}
            >
              <span>👛</span> WALLET
            </button>
          </nav>
        </div>

        <div className="pt-6 border-t border-neutral-800/80">
          <button onClick={() => supabase.auth.signOut()} className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-red-400 bg-red-500/10 rounded-lg hover:bg-red-500/20 border border-red-500/20 transition">
            🚪 LOGOUT
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-[#12141a]/90 backdrop-blur border-b border-neutral-800/80 px-6 py-4 flex items-center justify-between">
          <div className="text-xs font-bold text-neutral-400">
            ID: <span className="text-amber-500 font-mono font-black">{profile?.registration_id || 'PLAYER'}</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-[#0a0b0e] border border-neutral-800 px-4 py-1.5 rounded-lg">
              <span className="text-xs font-black text-amber-400">👛 ₹{profile?.wallet_balance || '0.00'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-amber-500 text-black font-black flex items-center justify-center text-xs">
                {profile?.full_name?.charAt(0) || 'P'}
              </div>
              <span className="text-xs font-bold text-white hidden sm:inline">{profile?.full_name || 'GAMER'}</span>
            </div>
          </div>
        </header>

        {/* Dashboard Main View */}
        <main className="p-6 max-w-6xl w-full mx-auto space-y-6">
          
          {/* Welcome Banner */}
          <div className="bg-gradient-to-r from-amber-500/20 via-[#12141a] to-[#12141a] border border-neutral-800/80 rounded-2xl p-6 flex justify-between items-center relative overflow-hidden">
            <div>
              <h2 className="text-2xl font-black text-white tracking-wider">WELCOME BACK, <span className="text-amber-500">{profile?.full_name || 'GAMER'}</span> 👋</h2>
              <p className="text-xs text-neutral-400 font-semibold mt-1">Ready to dominate the arena?</p>
            </div>
          </div>

          {activeTab === 'tournaments' && (
            <div className="space-y-4">
              <h3 className="text-xs font-black tracking-widest uppercase text-amber-500 flex items-center gap-2">
                <span className="w-1 h-3 bg-amber-500 inline-block"></span> Live & Upcoming Matches
              </h3>

              {tournaments.length === 0 ? (
                <div className="bg-[#12141a] border border-neutral-800 rounded-xl p-12 text-center">
                  <p className="text-xs text-neutral-500 font-semibold">Abhi koi match schedule nahi hua hai.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {tournaments.map((t) => {
                    const userReg = registrations.find(r => r.tournament_id === t.id);
                    const roomReady = isRoomVisible(t.match_time, t.room_visibility_minutes);

                    return (
                      <div key={t.id} className="bg-[#12141a] border border-neutral-800/80 rounded-xl overflow-hidden shadow-2xl hover:border-amber-500/40 transition">
                        <div className="bg-[#0a0b0e] px-4 py-2.5 border-b border-neutral-800 flex justify-between items-center">
                          <span className="text-[10px] font-black uppercase text-amber-400 tracking-widest bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">{t.game_mode}</span>
                          <span className="text-[10px] font-mono font-bold text-neutral-400">{new Date(t.match_time).toLocaleString('en-IN', { timeStyle: 'short', dateStyle: 'short' })}</span>
                        </div>

                        <div className="p-5 space-y-4">
                          <h4 className="font-black text-base text-white tracking-wide">{t.title}</h4>

                          <div className="grid grid-cols-3 gap-2 bg-[#0a0b0e] p-3 rounded-lg border border-neutral-800/80 text-center">
                            <div>
                              <p className="text-[9px] text-neutral-500 uppercase font-black">1st Prize</p>
                              <p className="text-xs font-black text-amber-400">₹{t.first_prize}</p>
                            </div>
                            <div>
                              <p className="text-[9px] text-neutral-500 uppercase font-black">2nd Prize</p>
                              <p className="text-xs font-black text-neutral-300">₹{t.second_prize}</p>
                                    </div>
                            <div>
                              <p className="text-[9px] text-neutral-500 uppercase font-black">Per Kill</p>
                              <p className="text-xs font-black text-emerald-400">₹{t.kill_reward}</p>
                            </div>
                          </div>

                          {userReg?.status === 'approved' && (
                            <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/5 space-y-1">
                              <div className="flex items-center justify-between text-xs font-bold text-amber-400">
                                <span>🔑 Room Credentials</span>
                                {!roomReady && <span className="text-[9px] text-neutral-400 font-normal">Unlocks 15m before match</span>}
                              </div>
                              {roomReady ? (
                                <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-[#0a0b0e] p-2 rounded border border-neutral-800 mt-1">
                                  <div><span className="text-neutral-500">ID:</span> <span className="text-white font-bold">{t.room_id || 'TBA'}</span></div>
                                  <div><span className="text-neutral-500">PASS:</span> <span className="text-white font-bold">{t.room_password || 'TBA'}</span></div>
                                </div>
                              ) : (
                                <p className="text-[10px] text-neutral-400 italic">Protected. Match se 15 minute pehle auto-unlock hoga.</p>
                              )}
                            </div>
                          )}

                          <div>
                            {!userReg ? (
                              <button className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-black rounded-lg text-xs uppercase tracking-widest shadow-lg shadow-amber-500/10 transition">
                                Register (Entry: ₹{t.entry_fee})
                              </button>
                            ) : (
                              <div className="flex items-center justify-between bg-[#0a0b0e] px-4 py-2.5 rounded-lg border border-neutral-800">
                                <span className="text-xs text-neutral-400 font-bold">Status:</span>
                                <span className={`text-xs font-black uppercase ${userReg.status === 'approved' ? 'text-emerald-400' : userReg.status === 'rejected' ? 'text-red-400' : 'text-amber-400'}`}>
                                  {userReg.status}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              <h3 className="text-xs font-black tracking-widest uppercase text-amber-500 flex items-center gap-2">
                <span className="w-1 h-3 bg-amber-500 inline-block"></span> Private Match History
              </h3>

              {registrations.length === 0 ? (
                <div className="bg-[#12141a] border border-neutral-800 rounded-xl p-12 text-center">
                  <p className="text-xs text-neutral-500 font-semibold">Koi registration nahi mili.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {registrations.map(reg => (
                    <div key={reg.id} className="bg-[#12141a] border border-neutral-800/80 p-4 rounded-xl flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-sm text-neutral-100">{reg.tournaments?.title}</h4>
                        <p className="text-[10px] text-neutral-500 font-mono mt-0.5">{new Date(reg.registered_at).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase ${reg.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-neutral-800 text-neutral-400'}`}>
                          {reg.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'wallet' && (
            <div className="space-y-6 max-w-xl">
              <div className="bg-[#12141a] p-6 rounded-2xl border border-amber-500/30 text-center space-y-3 shadow-2xl">
                <p className="text-[10px] text-neutral-400 uppercase font-black tracking-widest">Available Balance</p>
                <p className="text-4xl font-black text-amber-400">₹{profile?.wallet_balance || '0.00'}</p>
                <button className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-black rounded-lg text-xs uppercase tracking-widest transition">
                  Withdraw Request
                </button>
              </div>

              <div className="space-y-3">
                <h4 className="text-[11px] font-black text-neutral-400 uppercase tracking-widest">Transaction Ledger</h4>
                {walletTxns.length === 0 ? (
                  <p className="text-xs text-neutral-500 text-center py-6 bg-[#12141a] rounded-xl border border-neutral-800">Koi transactions nahi hain.</p>
                ) : (
                  walletTxns.map(txn => (
                    <div key={txn.id} className="bg-[#12141a] border border-neutral-800/80 p-3.5 rounded-xl flex justify-between items-center text-xs">
                      <div>
                        <p className="font-bold text-neutral-200">{txn.description}</p>
                        <p className="text-[10px] text-neutral-500">{new Date(txn.created_at).toLocaleString()}</p>
                      </div>
                      <span className={`font-mono font-black ${txn.amount > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {txn.amount > 0 ? `+₹${txn.amount}` : `-₹${Math.abs(txn.amount)}`}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
                          }
                            
