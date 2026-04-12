'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'

interface ReservationInfo {
  nom: string
  date: string
  heure: string
  personnes: number
}

function fmtDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

function StarButton({ value, selected, hovered, onHover, onClick }: {
  value: number; selected: boolean; hovered: boolean
  onHover: (v: number) => void; onClick: (v: number) => void
}) {
  const filled = selected || hovered
  return (
    <button
      type="button"
      onClick={() => onClick(value)}
      onMouseEnter={() => onHover(value)}
      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', fontSize: 40, lineHeight: 1, transition: 'transform 0.1s', transform: filled ? 'scale(1.15)' : 'scale(1)' }}
    >
      <span style={{ color: filled ? '#c9a96e' : '#d4d0ca' }}>★</span>
    </button>
  )
}

export default function FeedbackPage() {
  const { token } = useParams<{ token: string }>()
  const [info,    setInfo]    = useState<ReservationInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [invalid, setInvalid] = useState(false)
  const [alreadyDone, setAlreadyDone] = useState(false)

  const [score,   setScore]   = useState(0)
  const [hovered, setHovered] = useState(0)
  const [comment, setComment] = useState('')
  const [sending, setSending] = useState(false)
  const [result,  setResult]  = useState<{ score: number; google_maps_url: string | null } | null>(null)

  useEffect(() => {
    fetch(`/api/feedback?token=${token}`)
      .then(r => r.json())
      .then(data => {
        if (!data.valid) { setInvalid(true); return }
        if (data.already_submitted) { setAlreadyDone(true); return }
        setInfo({ nom: data.nom, date: data.date, heure: data.heure, personnes: data.personnes })
      })
      .catch(() => setInvalid(true))
      .finally(() => setLoading(false))
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!score) return
    setSending(true)
    const res  = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, score, comment }),
    })
    const data = await res.json()
    if (res.ok) {
      setResult({ score, google_maps_url: data.google_maps_url })
    }
    setSending(false)
  }

  const labelScore = ['', 'Très déçu(e)', 'Déçu(e)', 'Correct', 'Très bien', 'Excellent !']
  const active = hovered || score

  // ── Conteneur commun ────────────────────────────────────────────────────────
  const wrap = (content: React.ReactNode) => (
    <div style={{ minHeight: '100vh', background: '#0c0b09', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'Georgia, serif' }}>
      <div style={{ background: '#faf9f7', maxWidth: 480, width: '100%', borderRadius: 6, padding: '48px 40px', textAlign: 'center' }}>
        <p style={{ color: '#c9a96e', fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', margin: '0 0 8px' }}>L'Orfèvre</p>
        {content}
      </div>
    </div>
  )

  if (loading) return wrap(<p style={{ color: '#888', fontSize: 14 }}>Chargement…</p>)

  if (invalid) return wrap(
    <>
      <h2 style={{ fontSize: 22, fontWeight: 'normal', margin: '0 0 12px', color: '#1a1a1a' }}>Lien invalide</h2>
      <p style={{ color: '#888', fontSize: 14 }}>Ce lien est invalide ou a expiré.</p>
    </>
  )

  if (alreadyDone) return wrap(
    <>
      <div style={{ fontSize: 40, marginBottom: 16 }}>✓</div>
      <h2 style={{ fontSize: 22, fontWeight: 'normal', margin: '0 0 12px', color: '#1a1a1a' }}>Avis déjà soumis</h2>
      <p style={{ color: '#888', fontSize: 14 }}>Vous avez déjà laissé un avis pour cette réservation. Merci !</p>
    </>
  )

  // ── Résultat après soumission ────────────────────────────────────────────────
  if (result) {
    if (result.score >= 4) return wrap(
      <>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🙏</div>
        <h2 style={{ fontSize: 22, fontWeight: 'normal', margin: '0 0 12px', color: '#1a1a1a' }}>Merci !</h2>
        <p style={{ color: '#555', fontSize: 14, lineHeight: 1.7, marginBottom: 32 }}>
          Votre retour nous touche sincèrement.<br/>
          Si vous souhaitez partager votre expérience, cela nous aiderait énormément.
        </p>
        {result.google_maps_url ? (
          <a
            href={result.google_maps_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'inline-block', background: '#1a1a1a', color: '#fff', padding: '14px 32px', textDecoration: 'none', fontSize: 12, fontFamily: 'system-ui, sans-serif', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', borderRadius: 3 }}
          >
            Laisser un avis Google
          </a>
        ) : (
          <p style={{ color: '#c9a96e', fontSize: 13 }}>À très bientôt chez L'Orfèvre ✦</p>
        )}
      </>
    )

    return wrap(
      <>
        <div style={{ fontSize: 40, marginBottom: 16 }}>✉️</div>
        <h2 style={{ fontSize: 22, fontWeight: 'normal', margin: '0 0 12px', color: '#1a1a1a' }}>Merci pour votre retour</h2>
        <p style={{ color: '#555', fontSize: 14, lineHeight: 1.7 }}>
          Nous prenons votre avis très au sérieux.<br/>
          Notre équipe vous répondra personnellement par email.
        </p>
      </>
    )
  }

  // ── Formulaire ───────────────────────────────────────────────────────────────
  return wrap(
    <>
      <h2 style={{ fontSize: 22, fontWeight: 'normal', margin: '0 0 6px', color: '#1a1a1a' }}>Comment était votre soirée ?</h2>
      {info && (
        <p style={{ color: '#888', fontSize: 13, margin: '0 0 32px' }}>
          {fmtDate(info.date)} à {info.heure?.slice(0, 5)} · {info.personnes} pers.
        </p>
      )}

      <form onSubmit={handleSubmit}>
        {/* Étoiles */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginBottom: 8 }} onMouseLeave={() => setHovered(0)}>
          {[1, 2, 3, 4, 5].map(v => (
            <StarButton key={v} value={v} selected={v <= score} hovered={v <= hovered} onHover={setHovered} onClick={setScore} />
          ))}
        </div>
        <p style={{ color: active ? '#c9a96e' : '#ccc', fontSize: 13, marginBottom: 28, minHeight: 20, transition: 'color 0.2s' }}>
          {active ? labelScore[active] : 'Cliquez pour noter'}
        </p>

        {/* Commentaire */}
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder={score > 0 && score <= 3 ? 'Dites-nous ce qui n\'a pas été à la hauteur…' : 'Partagez votre expérience (optionnel)'}
          rows={4}
          style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', border: '1px solid #e0dbd4', borderRadius: 3, fontSize: 14, fontFamily: 'Georgia, serif', color: '#1a1a1a', background: 'white', resize: 'vertical', outline: 'none', marginBottom: 24 }}
        />

        <button
          type="submit"
          disabled={!score || sending}
          style={{ width: '100%', background: score ? '#1a1a1a' : '#ccc', color: '#fff', border: 'none', padding: '14px', fontSize: 12, fontFamily: 'system-ui, sans-serif', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: score ? 'pointer' : 'not-allowed', borderRadius: 3, transition: 'background 0.2s' }}
        >
          {sending ? 'Envoi…' : 'Envoyer mon avis'}
        </button>
      </form>
    </>
  )
}
