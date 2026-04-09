import { Resend } from 'resend'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const RESTAURANT_ID = '106bab84-a847-4392-8272-4f70fcac3291'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function assignerTable(
  nbPersonnes: number,
  date: string,
  heure: string
): Promise<{ id: string; label: string } | null> {
  const supabase = getSupabase()

  // 1. Tables actives avec capacité suffisante
  const { data: tables, error: tablesError } = await supabase
    .from('floor_tables')
    .select('id, label, number, capacity')
    .eq('restaurant_id', RESTAURANT_ID)
    .eq('status', 'active')
    .gte('capacity', nbPersonnes)
    .order('capacity', { ascending: true })

  if (tablesError || !tables || tables.length === 0) {
    console.warn('[assignerTable] Aucune table trouvée:', tablesError?.message)
    return null
  }

  // 2. Réservations existantes sur le créneau ±1h30
  const heureNormalisee = heure.slice(0, 5)
  const heureDate = new Date(`${date}T${heureNormalisee}:00`)
  const heureMinus = new Date(heureDate.getTime() - 90 * 60 * 1000).toTimeString().slice(0, 5)
  const heurePlus  = new Date(heureDate.getTime() + 90 * 60 * 1000).toTimeString().slice(0, 5)

  const { data: reservationsOccupees } = await supabase
    .from('reservations')
    .select('table_id')
    .eq('restaurant_id', RESTAURANT_ID)
    .eq('date', date)
    .gte('heure', heureMinus)
    .lte('heure', heurePlus)
    .not('statut', 'eq', 'annulée')

  const tablesOccupees = new Set((reservationsOccupees ?? []).map(r => r.table_id))

  // 3. Première table libre
  const tableLibre = tables.find(t => !tablesOccupees.has(t.id))
  if (!tableLibre) return null

  return {
    id: tableLibre.id,
    label: tableLibre.label || `Table ${tableLibre.number}`,
  }
}

export async function POST(req: Request) {
  const supabase = getSupabase()
  const body = await req.json()
  const { nom, email, telephone, personnes, date, heure, message } = body

  if (!nom || !email || !date || !heure || !personnes) {
    return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 })
  }

  const nbPersonnes = parseInt(personnes)

  // Trouver une table disponible
  const table = await assignerTable(nbPersonnes, date, heure)

  if (!table) {
    return NextResponse.json(
      { error: 'Aucune table disponible pour ce créneau. Veuillez choisir une autre heure.' },
      { status: 409 }
    )
  }

  // Insérer la réservation
  const { error: insertError } = await supabase.from('reservations').insert([{
    nom,
    email,
    telephone,
    personnes: nbPersonnes,
    date,
    heure,
    message,
    statut: 'en attente',
    restaurant_id: RESTAURANT_ID,
    table_id: table.id,
  }])

  if (insertError) {
    console.error('Supabase insert error:', insertError)
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  // Email de confirmation
  try {
    if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY manquante')
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: "L'Orfèvre <reservations@burstflow.fr>",
      to: email,
      subject: "✅ Votre réservation est confirmée — L'Orfèvre",
      html: `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #1a1a1a;">
          <h1 style="font-size: 28px; font-weight: normal; margin-bottom: 8px;">L'Orfèvre</h1>
          <p style="color: #666; margin-bottom: 32px; font-size: 14px; letter-spacing: 0.1em; text-transform: uppercase;">Confirmation de réservation</p>
          <p style="font-size: 18px; margin-bottom: 24px;">Bonjour ${nom},</p>
          <p style="color: #444; line-height: 1.7; margin-bottom: 32px;">
            Nous avons bien reçu votre réservation et nous sommes ravis de vous accueillir prochainement.
          </p>
          <div style="background: #f9f7f4; border-left: 3px solid #c9a96e; padding: 24px; margin-bottom: 32px;">
            <p style="margin: 0 0 8px; font-size: 14px; color: #888; text-transform: uppercase; letter-spacing: 0.1em;">Détails</p>
            <p style="margin: 4px 0; font-size: 16px;"><strong>Date :</strong> ${new Date(date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            <p style="margin: 4px 0; font-size: 16px;"><strong>Heure :</strong> ${heure}</p>
            <p style="margin: 4px 0; font-size: 16px;"><strong>Couverts :</strong> ${personnes} personne${nbPersonnes > 1 ? 's' : ''}</p>
            <p style="margin: 4px 0; font-size: 16px;"><strong>Table :</strong> ${table.label}</p>
          </div>
          <p style="color: #666; font-size: 14px; line-height: 1.7;">
            En cas d'empêchement, merci de nous prévenir au <strong>+33 1 42 00 00 00</strong>.
          </p>
          <p style="margin-top: 40px; color: #888; font-size: 13px;">À très bientôt,<br/>L'équipe de L'Orfèvre</p>
        </div>
      `
    })
  } catch (emailError) {
    console.error('Email error:', emailError)
  }

  return NextResponse.json({ success: true, table: table.label })
}
