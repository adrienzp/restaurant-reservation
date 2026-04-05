import { Resend } from 'resend'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const resend = new Resend(process.env.RESEND_API_KEY)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const RESTAURANT_ID = '9e26803b-5e71-468b-b953-c2d000049f8e'

async function assignerTable(nbPersonnes: number, date: string, heure: string): Promise<string | null> {
  // 1. Récupère toutes les tables du restaurant avec capacité suffisante
  const { data: tables, error: tablesError } = await supabase
    .from('tables_restaurant')
    .select('id, numero, capacite')
    .eq('restaurant_id', RESTAURANT_ID)
    .gte('capacite', nbPersonnes)
    .order('capacite', { ascending: true }) // Prend la plus petite table qui convient

  if (tablesError || !tables || tables.length === 0) return null

  // 2. Récupère les réservations déjà existantes pour ce créneau (±2h)
  const heureDate = new Date(`${date}T${heure}`)
  const heureMinus = new Date(heureDate.getTime() - 2 * 60 * 60 * 1000).toTimeString().slice(0, 5)
  const heurePlus = new Date(heureDate.getTime() + 2 * 60 * 60 * 1000).toTimeString().slice(0, 5)

  const { data: reservationsOccupees } = await supabase
    .from('reservations')
    .select('table_id')
    .eq('restaurant_id', RESTAURANT_ID)
    .eq('date_reservation', date)
    .gte('heure_reservation', heureMinus)
    .lte('heure_reservation', heurePlus)
    .not('statut', 'eq', 'annulée')

  const tablesOccupees = new Set(reservationsOccupees?.map(r => r.table_id) || [])

  // 3. Trouve la première table libre
  const tableLibre = tables.find(t => !tablesOccupees.has(t.id))

  return tableLibre?.id || null
}

export async function POST(req: Request) {
  const body = await req.json()
  const { nom, email, telephone, personnes, date, heure, message } = body

  if (!nom || !email || !date || !heure || !personnes) {
    return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 })
  }

  // Assigner une table automatiquement
  const tableId = await assignerTable(parseInt(personnes), date, heure)

  if (!tableId) {
    return NextResponse.json(
      { error: 'Aucune table disponible pour ce créneau. Veuillez choisir une autre heure.' },
      { status: 409 }
    )
  }

  // Insérer la réservation avec la table assignée
  const { error: insertError } = await supabase.from('reservations').insert([{
    client_nom: nom,
    client_email: email,
    client_telephone: telephone,
    nb_personnes: parseInt(personnes),
    date_reservation: date,
    heure_reservation: heure,
    message,
    table_id: tableId,
    restaurant_id: RESTAURANT_ID,
    statut: 'en attente',
  }])

  if (insertError) {
    console.error('Supabase insert error:', insertError)
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  // Récupérer le numéro de table pour l'email
  const { data: tableData } = await supabase
    .from('tables_restaurant')
    .select('numero')
    .eq('id', tableId)
    .single()

  // Envoyer l'email de confirmation
  try {
    await resend.emails.send({
      from: "L'Orfèvre <reservations@burstflow.fr>",
      to: email,
      subject: '✅ Votre réservation est confirmée — L\'Orfèvre',
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
            <p style="margin: 4px 0; font-size: 16px;"><strong>Couverts :</strong> ${personnes} personne${parseInt(personnes) > 1 ? 's' : ''}</p>
            <p style="margin: 4px 0; font-size: 16px;"><strong>Table :</strong> ${tableData?.numero || 'assignée'}</p>
          </div>
          <p style="color: #666; font-size: 14px; line-height: 1.7;">
            Un membre de notre équipe vous contactera si nécessaire pour confirmer ou ajuster votre réservation.<br/>
            En cas d'empêchement, merci de nous prévenir au <strong>06 61 58 72 31</strong>.
          </p>
          <p style="margin-top: 40px; color: #888; font-size: 13px;">À très bientôt,<br/>L'équipe de L'Orfèvre</p>
        </div>
      `
    })
  } catch (emailError) {
    console.error('Email error:', emailError)
    // On ne bloque pas si l'email échoue
  }

  return NextResponse.json({ success: true, table: tableData?.numero })
}
