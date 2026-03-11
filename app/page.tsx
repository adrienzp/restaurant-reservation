'use client'

import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Home() {
  const [form, setForm] = useState({
    nom: '', email: '', telephone: '', date: '', heure: '', personnes: 1, message: ''
  })
  const [loading, setLoading] = useState(false)
  const [succes, setSucces] = useState(false)
  const [erreur, setErreur] = useState('')

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
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

  if (res.ok) {
    setSucces(true)
  } else {
    setErreur('Une erreur est survenue, veuillez réessayer.')
  }
  setLoading(false)
}

  if (succes) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-10 rounded-2xl shadow text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold mb-2">Réservation confirmée !</h2>
        <p className="text-gray-500">Nous vous contacterons pour confirmer votre table.</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow p-8 w-full max-w-lg">
        <h1 className="text-3xl font-bold mb-2">Réserver une table</h1>
        <p className="text-gray-500 mb-6">Remplissez le formulaire ci-dessous</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nom complet</label>
            <input name="nom" required onChange={handleChange} value={form.nom}
              className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="Jean Dupont" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input name="email" type="email" required onChange={handleChange} value={form.email}
              className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="jean@email.com" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Téléphone</label>
            <input name="telephone" required onChange={handleChange} value={form.telephone}
              className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="06 12 34 56 78" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <input name="date" type="date" required onChange={handleChange} value={form.date}
                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Heure</label>
              <select name="heure" required onChange={handleChange} value={form.heure}
                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black">
                <option value="">Choisir</option>
                {['12:00','12:30','13:00','13:30','19:00','19:30','20:00','20:30','21:00','21:30'].map(h => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Nombre de personnes</label>
            <select name="personnes" onChange={handleChange} value={form.personnes}
              className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black">
              {[1,2,3,4,5,6,7,8].map(n => (
                <option key={n} value={n}>{n} personne{n > 1 ? 's' : ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Message (optionnel)</label>
            <textarea name="message" onChange={handleChange} value={form.message} rows={3}
              className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="Allergie, occasion spéciale..." />
          </div>

          {erreur && <p className="text-red-500 text-sm">{erreur}</p>}

          <button type="submit" disabled={loading}
            className="w-full bg-black text-white py-3 rounded-lg font-medium hover:bg-gray-800 transition disabled:opacity-50">
            {loading ? 'Envoi en cours...' : 'Réserver ma table'}
          </button>
        </form>
      </div>
    </div>
  )
}