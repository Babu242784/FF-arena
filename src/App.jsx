import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Trophy, Wallet, Shield, Award, Key, Bell } from 'lucide-react';

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
      <div className="min-h-screen bg-slate-950 text-amber-400 flex items-center justify-center font-bold">
        Loading FF ARENA...
      </div>
    );
  }

  // LOGIN / SIGNUP SCREEN
  if (!session) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-slate-900 border border-amber-500/30 rounded-2xl p-6 shadow-2xl space-y-6">
          <div className="text-center space-y-1">
            <div className="w-12 h-12 bg-amber-500 text-slate-950 font-black text-2xl flex items-center justify-center rounded-xl mx-auto shadow-lg shadow-amber-500/20">
              FF
            </div>
            <h1 className="text-xl font-extrabold tracking-wider text-amber-400">FF ARENA</h1>
            <p className="text-xs text-slate-400">{isSignUp ? 'Create your account' : 'Login to compete'}</p>
          </div>

          {authError && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3 rounded-lg text-center font-medium">
              {authError}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="In-game Name"
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            )}

            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="player@esports.com"
                className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase rounded-lg shadow-lg shadow-amber-500/10 tracking-wider transition"
            >
              {isSignUp ? 'Create Account' : 'Login'}
            </button>
          </form>

          <div className="text-center pt-2 border-t border-slate-800">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setAuthError('');
              }}
              className="text-xs text-slate-400 hover:text-amber-400 font-semibold"
            >
              {isSignUp ? 'Already have an account? Login' : "Don't have an account? Sign Up"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // MAIN DASHBOARD UI
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-20">
      <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur border-b border-amber-500/20 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-slate-950 font-black text-xl">
            FF
          </div>
          <div>
            <h1 className="font-extrabold tracking-wider text-amber-400 text-base leading-tight">FF ARENA</h1>
            <p className="text-[10px] text-slate-400 font-mono">ID: {profile?.registration_id}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-800/80 border border-amber-500/30 px-3 py-1 rounded-full">
            <Wallet className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-bold text-amber-300">₹{profile?.wallet_balance || '0.00'}</span>
          </div>
          <button onClick={() => supabase.auth.signOut()} className="text-[10px] bg-slate-800 hover:bg-red-500/20 hover:text-red-400 text-slate-400 px-2 py-1 rounded border border-slate-700">
            Logout
          </button>
        </div>
      </header>

      <main className="p-4 max-w-md mx-auto space-y-4">
        {activeTab === 'tournaments' && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold tracking-wider uppercase text-slate-400 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" /> Live & Upcoming Matches
            </h2>

            {tournaments.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-8">Abhi koi match schedule nahi hua hai.</p>
            ) : (
              tournaments.map((t) => {
                const userReg = registrations.find(r => r.tournament_id === t.id);
                const roomReady = isRoomVisible(t.match_time, t.room_visibility_minutes);

                return (
                  <div key={t.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg hover:border-amber-500/40 transition">
                    <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent px-4 py-2 border-b border-slate-800/80 flex justify-between items-center">
                      <span className="text-xs font-black uppercase text-amber-400 tracking-wider">{t.game_mode}</span>
                      <span className="text-[11px] font-mono text-slate-400">{new Date(t.match_time).toLocaleString('en-IN', { timeStyle: 'short', dateStyle: 'short' })}</span>
                    </div>

                    <div className="p-4 space-y-3">
                      <h3 className="font-bold text-base text-slate-100">{t.title}</h3>

                      <div className="grid grid-cols-3 gap-2 bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-center">
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase font-semibold">1st Prize</p>
                          <p className="text-xs font-black text-amber-400">₹{t.first_prize}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase font-semibold">2nd Prize</p>
                          <p className="text-xs font-black text-slate-300">₹{t.second_prize}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase font-semibold">Per Kill</p>
                          <p className="text-xs font-black text-emerald-400">₹{t.kill_reward}</p>
                        </div>
                      </div>

                      {userReg?.status === 'approved' && (
                        <div className="mt-3 p-3 rounded-lg border border-amber-500/30 bg-amber-500/5 space-y-1">
                          <div className="flex items-center justify-between text-xs font-bold text-amber-400">
                            <span className="flex items-center gap-1"><Key className="w-3.5 h-3.5" /> Room Credentials</span>
                            {!roomReady && <span className="text-[10px] text-slate-400 font-normal">Unlocks 15m before match</span>}
                          </div>
                          {roomReady ? (
                            <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-slate-950 p-2 rounded border border-slate-800 mt-1">
                              <div><span className="text-slate-500">ID:</span> <span className="text-white font-bold">{t.room_id || 'TBA'}</span></div>
                              <div><span className="text-slate-500">PASS:</span> <span className="text-white font-bold">{t.room_password || 'TBA'}</span></div>
                            </div>
                          ) : (
                            <p className="text-[11px] text-slate-400 italic">Protected. Match se 15 minute pehle auto-unlock hoga.</p>
                          )}
                        </div>
                      )}

                      <div className="pt-1">
                        {!userReg ? (
                          <button className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black rounded-lg text-xs uppercase tracking-wider shadow-md shadow-amber-500/10">
                            Register (Entry: ₹{t.entry_fee})
                          </button>
                        ) : (
                          <div className="flex items-center justify-between bg-slate-950 px-3 py-2 rounded-lg border border-slate-800">
                            <span className="text-xs text-slate-400">Status:</span>
                            <span className={`text-xs font-bold uppercase ${userReg.status === 'approved' ? 'text-emerald-400' : userReg.status === 'rejected' ? 'text-red-400' : 'text-amber-400'}`}>
                              {userReg.status}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold tracking-wider uppercase text-slate-400 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" /> Private Match History
            </h2>

            {registrations.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-8">Koi registration nahi mili.</p>
            ) : (
              registrations.map(reg => (
                <div key={reg.id} className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-xs text-slate-200">{reg.tournaments?.title}</h4>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">{new Date(reg.registered_at).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${reg.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-400'}`}>
                      {reg.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'wallet' && (
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-4 rounded-xl border border-amber-500/30 text-center space-y-2">
              <p className="text-xs text-slate-400 uppercase font-semibold">Available Balance</p>
              <p className="text-3xl font-black text-amber-400">₹{profile?.wallet_balance || '0.00'}</p>
              <button className="w-full mt-2 py-2 bg-amber-500 text-slate-950 font-bold rounded-lg text-xs uppercase">
                Withdraw Request
              </button>
            </div>

            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider pt-2">Transaction Ledger</h3>
            <div className="space-y-2">
              {walletTxns.map(txn => (
                <div key={txn.id} className="bg-slate-900 border border-slate-800 p-3 rounded-lg flex justify-between items-center text-xs">
                  <div>
                    <p className="font-bold text-slate-200">{txn.description}</p>
                    <p className="text-[10px] text-slate-500">{new Date(txn.created_at).toLocaleString()}</p>
                  </div>
                  <span className={`font-mono font-bold ${txn.amount > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {txn.amount > 0 ? `+₹${txn.amount}` : `-₹${Math.abs(txn.amount)}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur border-t border-slate-800 py-2 px-6 flex justify-around items-center z-50">
        <button onClick={() => setActiveTab('tournaments')} className={`flex flex-col items-center gap-1 ${activeTab === 'tournaments' ? 'text-amber-400' : 'text-slate-500'}`}>
          <Trophy className="w-5 h-5" />
          <span className="text-[10px] font-bold">Matches</span>
        </button>
        <button onClick={() => setActiveTab('history')} className={`flex flex-col items-center gap-1 ${activeTab === 'history' ? 'text-amber-400' : 'text-slate-500'}`}>
          <Award className="w-5 h-5" />
          <span className="text-[10px] font-bold">History</span>
        </button>
        <button onClick={() => setActiveTab('wallet')} className={`flex flex-col items-center gap-1 ${activeTab === 'wallet' ? 'text-amber-400' : 'text-slate-500'}`}>
          <Wallet className="w-5 h-5" />
          <span className="text-[10px] font-bold">Wallet</span>
        </button>
      </nav>
    </div>
  );
    }
        
