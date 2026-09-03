import React, { useState } from 'react'

export default function App() {
  const [user, setUser] = useState(null)
  const [email, setEmail] = useState('')
  const [wallet, setWallet] = useState(100)

  // Dummy Tournament Data
  const tournaments = [
    { id: 1, title: 'Solo Battle Royale', fee: 20, prize: 100, time: '6:00 PM' },
    { id: 2, title: 'Duo Clash Squad', fee: 40, prize: 200, time: '8:00 PM' },
  ]

  const handleLogin = (e) => {
    e.preventDefault()
    if (email) setUser(email)
  }

  const joinTournament = (fee) => {
    if (wallet >= fee) {
      setWallet(wallet - fee)
      alert('Tournament Joined Successfully!')
    } else {
      alert('Insufficient Balance! Please Add Money.')
    }
  }

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '500px', margin: '0 auto', padding: '20px', backgroundColor: '#121212', color: '#fff', minHeight: '100vh' }}>
      <header style={{ borderBottom: '1px solid #333', paddingBottom: '10px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ color: '#ff4757', margin: 0 }}>🔥 FF ARENA</h2>
        {user && <div style={{ background: '#2ed573', padding: '5px 10px', borderRadius: '5px', fontSize: '14px' }}>💰 Wallet: ₹{wallet}</div>}
      </header>

      {!user ? (
        <div style={{ background: '#1e1e1e', padding: '20px', borderRadius: '10px', textAlign: 'center' }}>
          <h3>Login to Play</h3>
          <form onSubmit={handleLogin}>
            <input 
              type="email" 
              placeholder="Enter your email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              required 
              style={{ width: '90%', padding: '10px', marginBottom: '10px', borderRadius: '5px', border: 'none' }}
            />
            <button type="submit" style={{ width: '95%', padding: '10px', background: '#ff4757', color: '#fff', border: 'none', borderRadius: '5px', fontWeight: 'bold' }}>
              LOGIN
            </button>
          </form>
        </div>
      ) : (
        <div>
          <p style={{ color: '#aaa' }}>Welcome, {user}</p>
          
          <h3>Upcoming Tournaments</h3>
          {tournaments.map((t) => (
            <div key={t.id} style={{ background: '#1e1e1e', padding: '15px', borderRadius: '8px', marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ margin: '0 0 5px 0' }}>{t.title}</h4>
                <small style={{ color: '#aaa' }}>Time: {t.time} | Entry: ₹{t.fee}</small>
                <div style={{ color: '#2ed573', fontWeight: 'bold', marginTop: '5px' }}>Prize Pool: ₹{t.prize}</div>
              </div>
              <button onClick={() => joinTournament(t.fee)} style={{ background: '#ff4757', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer' }}>
                JOIN
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

