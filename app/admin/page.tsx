'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

type Reservation = {
  id: string
  created_at: string
  nom: string
  email: string
  telephone: string
  date: string
  heure: string
  personnes: number
  message: string
  statut: string
}

export default function Admin() {
  const [autorise, setAutorise] = useState(false)
  const [mdp, setMdp] = useState('')
  const [erreur, setErreur] = useState(false)
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const ok = sessionStorage.getItem('admin_ok')
    if (ok === 'true') { setAutorise(true); fetchReservations() }
    else setLoading(false)
  }, [])

  const handleLogin = () => {
    if (mdp === 'admin123') {
      sessionStorage.setItem('admin_ok', 'true')
      setAutorise(true)
      fetchReservations()
    } else {
      setErreur(true)
    }
  }

  const fetchReservations = async () => {
    const { data } = await supabase
      .from('reservations')
      .select('*')
      .order('date', { ascending: true })
    setReservations(data || [])
    setLoading(false)
  }

  const updateStatut = async (id: string, statut: string) => {
    await supabase.from('reservations').update({ statut }).eq('id', id)
    fetchReservations()
  }

  const supprimer = async (id: string) => {
    await supabase.from('reservations').delete().eq('id', id)
    fetchReservations()
  }

  const statutColor = (statut: string) => {
    if (statut === 'confirmé') return 'bg-green-100 text-green-700'
    if (statut === 'annulé') return 'bg-red-100 text-red-700'
    return 'bg-yellow-100 text-yellow-700'
  }

  if (!autorise) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-2">Accès admin</h1>
        <p className="text-gray-500 mb-6 text-sm">Entrez le mot de passe pour continuer</p>
        <input type="password" value={mdp}
          onChange={(e) => { setMdp(e.target.value); setErreur(false) }}
          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          className="w-full border rounded-lg px-4 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-black"
          placeholder="Mot de passe" />
        {erreur && <p className="text-red-500 text-sm mb-3">Mot de passe incorrect</p>}
        <button onClick={handleLogin}
          className="w-full bg-black text-white py-3 rounded-lg font-medium hover:bg-gray-800 transition">
          Connexion
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Panel Admin</h1>
        <p className="text-gray-500 mb-6">Gestion des réservations</p>
        {loading ? (
          <p className="text-gray-400">Chargement...</p>
        ) : reservations.length === 0 ? (
          <p className="text-gray-400">Aucune réservation pour le moment.</p>
        ) : (
          <div className="space-y-4">
            {reservations.map((r) => (
              <div key={r.id} className="bg-white rounded-2xl shadow p-6">
                <div className="flex justify-between items-start flex-wrap gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h2 className="text-xl font-bold">{r.nom}</h2>
                      <span className={`text-xs px-3 py-1 rounded-full font-medium ${statutColor(r.statut)}`}>
                        {r.statut}
                      </span>
                    </div>
                    <p className="text-gray-500 text-sm">{r.email} · {r.telephone}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">{new Date(r.date).toLocaleDateString('fr-FR')} à {r.heure}</p>
                    <p className="text-gray-500 text-sm">{r.personnes} personne{r.personnes > 1 ? 's' : ''}</p>
                  </div>
                </div>
                {r.message && (
                  <p className="mt-3 text-sm text-gray-600 bg-gray-50 rounded-lg px-4 py-2">💬 {r.message}</p>
                )}
                <div className="flex gap-2 mt-4 flex-wrap">
                  <button onClick={() => updateStatut(r.id, 'confirmé')}
                    className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-600 transition">
                    ✓ Confirmer
                  </button>
                  <button onClick={() => updateStatut(r.id, 'annulé')}
                    className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-600 transition">
                    ✗ Annuler
                  </button>
                  <button onClick={() => supprimer(r.id)}
                    className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-300 transition">
                    🗑 Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}