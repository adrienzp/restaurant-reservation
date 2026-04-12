'use client'

import { useState } from 'react'

const HEURES = ['12:00','12:30','13:00','13:30','19:00','19:30','20:00','20:30','21:00','21:30']

export default function ReservationPage() {
  const [form, setForm] = useState({
    nom: '', email: '', telephone: '', date: '', heure: '', personnes: '2', message: ''
  })
  const [loading, setLoading] = useState(false)
  const [succes, setSucces] = useState<{ table: string } | null>(null)
  const [erreur, setErreur] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setErreur('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErreur('')

    const res = await fetch('/api/reservation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })

    const data = await res.json()

    if (res.ok) {
      setSucces({ table: data.table })
    } else {
      setErreur(data.error || 'Une erreur est survenue, veuillez réessayer.')
    }
    setLoading(false)
  }

  const today = new Date().toISOString().split('T')[0]

  if (succes) return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#faf9f7', fontFamily: 'Georgia, serif', padding: '24px'
    }}>
      <div style={{
        background: 'white', padding: '48px', borderRadius: '4px',
        textAlign: 'center', maxWidth: '480px', width: '100%',
        border: '1px solid #e8e4de'
      }}>
        <div style={{
          width: '56px', height: '56px', borderRadius: '50%',
          background: '#f0f7f0', border: '1px solid #c3dfc3',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px', fontSize: '24px'
        }}>✓</div>
        <h2 style={{ fontSize: '24px', fontWeight: 'normal', margin: '0 0 8px', color: '#1a1a1a' }}>
          Réservation confirmée
        </h2>
        <p style={{ color: '#888', marginBottom: '24px', fontSize: '14px' }}>
          {succes.table ? `Table ${succes.table} · ` : ''}Un email de confirmation vous a été envoyé
        </p>
        <button
          onClick={() => { setSucces(null); setForm({ nom: '', email: '', telephone: '', date: '', heure: '', personnes: '2', message: '' }) }}
          style={{
            background: 'none', border: '1px solid #c9a96e', color: '#c9a96e',
            padding: '10px 24px', borderRadius: '2px', cursor: 'pointer',
            fontSize: '13px', letterSpacing: '0.08em', textTransform: 'uppercase'
          }}
        >
          Nouvelle réservation
        </button>
      </div>
    </div>
  )

  const inputStyle = {
    width: '100%', padding: '10px 14px', border: '1px solid #e0dbd4',
    borderRadius: '2px', fontSize: '15px', color: '#1a1a1a',
    background: 'white', outline: 'none', boxSizing: 'border-box' as const,
    fontFamily: 'Georgia, serif', transition: 'border-color 0.2s'
  }

  const labelStyle = {
    display: 'block', fontSize: '12px', color: '#888',
    marginBottom: '6px', letterSpacing: '0.08em', textTransform: 'uppercase' as const
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#faf9f7',
      fontFamily: 'Georgia, serif', padding: '40px 24px',
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{ maxWidth: '520px', width: '100%' }}>

        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <p style={{ fontSize: '12px', color: '#c9a96e', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '8px' }}>
            L'Orfèvre
          </p>
          <h1 style={{ fontSize: '32px', fontWeight: 'normal', color: '#1a1a1a', margin: '0 0 8px' }}>
            Réserver une table
          </h1>
          <p style={{ color: '#888', fontSize: '14px', margin: 0 }}>
            Réservation instantanée · Confirmation par email
          </p>
        </div>

        <div style={{ background: 'white', border: '1px solid #e8e4de', borderRadius: '4px', padding: '36px' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Nom complet *</label>
                <input name="nom" required value={form.nom} onChange={handleChange}
                  style={inputStyle} placeholder="Jean Dupont" />
              </div>
              <div>
                <label style={labelStyle}>Téléphone *</label>
                <input name="telephone" required value={form.telephone} onChange={handleChange}
                  style={inputStyle} placeholder="06 12 34 56 78" />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Email *</label>
              <input name="email" type="email" required value={form.email} onChange={handleChange}
                style={inputStyle} placeholder="jean@email.com" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div style={{ gridColumn: 'span 1' }}>
                <label style={labelStyle}>Personnes</label>
                <select name="personnes" value={form.personnes} onChange={handleChange} style={inputStyle}>
                  {[1,2,3,4,5,6,7,8].map(n => (
                    <option key={n} value={n}>{n} pers.</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Date *</label>
                <input name="date" type="date" required min={today} value={form.date} onChange={handleChange}
                  style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Heure *</label>
                <select name="heure" required value={form.heure} onChange={handleChange} style={inputStyle}>
                  <option value="">—</option>
                  {HEURES.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label style={labelStyle}>Message (optionnel)</label>
              <textarea name="message" value={form.message} onChange={handleChange} rows={3}
                style={{ ...inputStyle, resize: 'vertical' }}
                placeholder="Allergie, occasion spéciale, demande particulière..." />
            </div>

            {erreur && (
              <div style={{
                background: '#fef2f2', border: '1px solid #fecaca',
                borderRadius: '2px', padding: '12px 14px',
                fontSize: '13px', color: '#dc2626'
              }}>
                {erreur}
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              background: loading ? '#d4b896' : '#c9a96e',
              color: 'white', border: 'none', padding: '14px',
              borderRadius: '2px', fontSize: '13px', letterSpacing: '0.1em',
              textTransform: 'uppercase', cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s', fontFamily: 'Georgia, serif'
            }}>
              {loading ? 'Recherche d\'une table...' : 'Confirmer la réservation'}
            </button>

          </form>
        </div>

        <p style={{ textAlign: 'center', color: '#aaa', fontSize: '12px', marginTop: '20px' }}>
          Une table vous sera assignée automatiquement selon vos préférences
        </p>
      </div>
    </div>
  )
}
