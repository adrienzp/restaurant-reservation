'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const RESTAURANT_ID = '9e26803b-5e71-468b-b953-c2d000049f8e'

type Reservation = {
  id: string
  created_at: string
  client_nom: string
  client_email: string
  client_telephone: string
  nb_personnes: number
  date_reservation: string
  heure_reservation: string
  message: string
  statut: string
  table_id: string
  tables_restaurant?: { numero: string }
}

const STATUT_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  'en attente':  { bg: '#fffbeb', color: '#d97706', label: 'En attente' },
  'confirmée':   { bg: '#f0fdf4', color: '#16a34a', label: 'Confirmée' },
  'annulée':     { bg: '#fef2f2', color: '#dc2626', label: 'Annulée' },
}

export default function AdminPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)
  const [loginError, setLoginError] = useState('')
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(false)
  const [filtre, setFiltre] = useState<'toutes' | 'en attente' | 'confirmée' | 'annulée'>('toutes')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setAuthed(true)
        fetchReservations()
      }
      setAuthLoading(false)
    })
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setLoginError('Email ou mot de passe incorrect')
    } else {
      setAuthed(true)
      fetchReservations()
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setAuthed(false)
    setReservations([])
  }

  const fetchReservations = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('reservations')
      .select('*, tables_restaurant(numero)')
      .eq('restaurant_id', RESTAURANT_ID)
      .order('date_reservation', { ascending: true })
      .order('heure_reservation', { ascending: true })

    if (!error) setReservations(data || [])
    setLoading(false)
  }

  const updateStatut = async (id: string, statut: string) => {
    await supabase.from('reservations').update({ statut }).eq('id', id)
    fetchReservations()
  }

  const supprimer = async (id: string) => {
    if (!confirm('Supprimer cette réservation ?')) return
    await supabase.from('reservations').delete().eq('id', id)
    fetchReservations()
  }

  const reservationsFiltrees = filtre === 'toutes'
    ? reservations
    : reservations.filter(r => r.statut === filtre)

  const counts = {
    toutes: reservations.length,
    'en attente': reservations.filter(r => r.statut === 'en attente').length,
    confirmée: reservations.filter(r => r.statut === 'confirmée').length,
    annulée: reservations.filter(r => r.statut === 'annulée').length,
  }

  if (authLoading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Georgia, serif' }}>
      <p style={{ color: '#888' }}>Chargement...</p>
    </div>
  )

  if (!authed) return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#faf9f7', fontFamily: 'Georgia, serif', padding: '24px'
    }}>
      <div style={{ background: 'white', border: '1px solid #e8e4de', borderRadius: '4px', padding: '40px', maxWidth: '400px', width: '100%' }}>
        <p style={{ fontSize: '12px', color: '#c9a96e', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '8px' }}>L'Orfèvre</p>
        <h1 style={{ fontSize: '24px', fontWeight: 'normal', margin: '0 0 24px', color: '#1a1a1a' }}>Espace admin</h1>
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Email</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', border: '1px solid #e0dbd4', borderRadius: '2px', fontSize: '15px', fontFamily: 'Georgia, serif', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Mot de passe</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', border: '1px solid #e0dbd4', borderRadius: '2px', fontSize: '15px', fontFamily: 'Georgia, serif', boxSizing: 'border-box' }} />
          </div>
          {loginError && <p style={{ color: '#dc2626', fontSize: '13px', margin: 0 }}>{loginError}</p>}
          <button type="submit" style={{
            background: '#c9a96e', color: 'white', border: 'none', padding: '12px',
            borderRadius: '2px', fontSize: '13px', letterSpacing: '0.1em',
            textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'Georgia, serif'
          }}>Connexion</button>
        </form>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#faf9f7', fontFamily: 'Georgia, serif' }}>

      {/* Header */}
      <div style={{ background: 'white', borderBottom: '1px solid #e8e4de', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ fontSize: '12px', color: '#c9a96e', letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 2px' }}>L'Orfèvre</p>
          <h1 style={{ fontSize: '20px', fontWeight: 'normal', margin: 0, color: '#1a1a1a' }}>Réservations</h1>
        </div>
        <button onClick={handleLogout} style={{
          background: 'none', border: '1px solid #e0dbd4', color: '#888',
          padding: '8px 16px', borderRadius: '2px', cursor: 'pointer',
          fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'Georgia, serif'
        }}>Déconnexion</button>
      </div>

      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '32px 24px' }}>

        {/* Stats + Filtres */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
          {(['toutes', 'en attente', 'confirmée', 'annulée'] as const).map(f => (
            <button key={f} onClick={() => setFiltre(f)} style={{
              padding: '8px 16px', borderRadius: '2px', cursor: 'pointer',
              fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase',
              fontFamily: 'Georgia, serif', transition: 'all 0.15s',
              background: filtre === f ? '#1a1a1a' : 'white',
              color: filtre === f ? 'white' : '#888',
              border: filtre === f ? '1px solid #1a1a1a' : '1px solid #e0dbd4',
            }}>
              {f === 'toutes' ? 'Toutes' : STATUT_STYLES[f]?.label} ({counts[f]})
            </button>
          ))}
          <button onClick={fetchReservations} style={{
            marginLeft: 'auto', background: 'none', border: '1px solid #e0dbd4',
            color: '#888', padding: '8px 16px', borderRadius: '2px', cursor: 'pointer',
            fontSize: '12px', fontFamily: 'Georgia, serif'
          }}>↻ Actualiser</button>
        </div>

        {/* Liste */}
        {loading ? (
          <p style={{ color: '#aaa', textAlign: 'center', padding: '40px' }}>Chargement...</p>
        ) : reservationsFiltrees.length === 0 ? (
          <p style={{ color: '#aaa', textAlign: 'center', padding: '40px' }}>Aucune réservation</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {reservationsFiltrees.map(r => {
              const statutStyle = STATUT_STYLES[r.statut] || STATUT_STYLES['en attente']
              return (
                <div key={r.id} style={{
                  background: 'white', border: '1px solid #e8e4de',
                  borderRadius: '4px', padding: '20px 24px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <h2 style={{ fontSize: '17px', fontWeight: 'normal', margin: 0, color: '#1a1a1a' }}>{r.client_nom}</h2>
                      <span style={{
                        fontSize: '11px', padding: '3px 10px', borderRadius: '2px',
                        background: statutStyle.bg, color: statutStyle.color,
                        letterSpacing: '0.08em', textTransform: 'uppercase'
                      }}>{statutStyle.label}</span>
                      {r.tables_restaurant && (
                        <span style={{ fontSize: '12px', color: '#c9a96e', letterSpacing: '0.05em' }}>
                          Table {r.tables_restaurant.numero}
                        </span>
                      )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ margin: 0, fontWeight: 'normal', fontSize: '16px', color: '#1a1a1a' }}>
                        {new Date(r.date_reservation).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })} à {r.heure_reservation.slice(0, 5)}
                      </p>
                      <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#888' }}>{r.nb_personnes} personne{r.nb_personnes > 1 ? 's' : ''}</p>
                    </div>
                  </div>

                  <p style={{ margin: '8px 0 0', fontSize: '13px', color: '#888' }}>
                    {r.client_email} · {r.client_telephone}
                  </p>

                  {r.message && (
                    <p style={{
                      margin: '10px 0 0', fontSize: '13px', color: '#666',
                      background: '#faf9f7', padding: '10px 14px',
                      borderRadius: '2px', borderLeft: '2px solid #e0dbd4'
                    }}>
                      {r.message}
                    </p>
                  )}

                  <div style={{ display: 'flex', gap: '8px', marginTop: '14px', flexWrap: 'wrap' }}>
                    {r.statut !== 'confirmée' && (
                      <button onClick={() => updateStatut(r.id, 'confirmée')} style={{
                        background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a',
                        padding: '6px 14px', borderRadius: '2px', cursor: 'pointer',
                        fontSize: '12px', letterSpacing: '0.05em', fontFamily: 'Georgia, serif'
                      }}>Confirmer</button>
                    )}
                    {r.statut !== 'annulée' && (
                      <button onClick={() => updateStatut(r.id, 'annulée')} style={{
                        background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626',
                        padding: '6px 14px', borderRadius: '2px', cursor: 'pointer',
                        fontSize: '12px', letterSpacing: '0.05em', fontFamily: 'Georgia, serif'
                      }}>Annuler</button>
                    )}
                    <button onClick={() => supprimer(r.id)} style={{
                      background: 'none', border: '1px solid #e0dbd4', color: '#aaa',
                      padding: '6px 14px', borderRadius: '2px', cursor: 'pointer',
                      fontSize: '12px', fontFamily: 'Georgia, serif'
                    }}>Supprimer</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
