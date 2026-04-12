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

  const { data: tables, error: tablesError } = await supabase
    .from('floor_tables')
    .select('id, label, number, capacity')
    .eq('restaurant_id', RESTAURANT_ID)
    .eq('status', 'active')
    .gte('capacity', nbPersonnes)
    .order('capacity', { ascending: true })

  if (tablesError || !tables || tables.length === 0) return null

  const heureNormalisee = heure.slice(0, 5)
  const heureDate  = new Date(`${date}T${heureNormalisee}:00`)
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
  const tableLibre = tables.find(t => !tablesOccupees.has(t.id))
  return tableLibre ? { id: tableLibre.id, label: tableLibre.label || `Table ${tableLibre.number}` } : null
}

function generateICS(nom: string, date: string, heure: string, personnes: string): string {
  const [year, month, day] = date.split('-')
  const [hour, minute] = heure.split(':')
  const dtStart = `${year}${month}${day}T${hour}${minute}00`
  const endHour = String(parseInt(hour) + 2).padStart(2, '0')
  const dtEnd   = `${year}${month}${day}T${endHour}${minute}00`
  const now     = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//BurstFlow//Restaurant Reservation//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${date}-${heure.replace(':', '')}-lorfevreparis@burstflow.fr`,
    `DTSTAMP:${now}Z`,
    `DTSTART;TZID=Europe/Paris:${dtStart}`,
    `DTEND;TZID=Europe/Paris:${dtEnd}`,
    `SUMMARY:Réservation L'Orfèvre`,
    `DESCRIPTION:Réservation pour ${personnes} personne${parseInt(personnes) > 1 ? 's' : ''} au nom de ${nom}`,
    `LOCATION:L'Orfèvre\\, Paris`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}

export async function POST(req: Request) {
  const supabase = getSupabase()
  const body = await req.json()
  const { nom, email, telephone, personnes, date, heure, message } = body

  if (!nom || !email || !date || !heure || !personnes) {
    return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 })
  }

  const nbPersonnes = parseInt(personnes)
  const table = await assignerTable(nbPersonnes, date, heure)

  // Récupérer l'email de notification depuis la config du restaurant
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('config')
    .eq('id', RESTAURANT_ID)
    .single()
  const notificationEmail: string = restaurant?.config?.notification_email || 'draze.droz@gmail.com'

  const insertData: Record<string, unknown> = {
    nom,
    email,
    telephone,
    personnes: nbPersonnes,
    date,
    heure,
    message,
    statut: 'en attente',
    restaurant_id: RESTAURANT_ID,
  }
  if (table) insertData.table_id = table.id

  const { error: insertError } = await supabase.from('reservations').insert([insertData])

  if (insertError) {
    console.error('Supabase insert error:', insertError)
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  try {
    if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY manquante')
    const resend = new Resend(process.env.RESEND_API_KEY)

    // Email de confirmation au client
    const icsContent = generateICS(nom, date, heure, personnes)
    await resend.emails.send({
      from: "L'Orfèvre <reservations@burstflow.fr>",
      to: email,
      subject: "✅ Votre réservation est confirmée — L'Orfèvre",
      attachments: [{ filename: 'reservation-lorfevreparis.ics', content: Buffer.from(icsContent).toString('base64') }],
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
            ${table ? `<p style="margin: 4px 0; font-size: 16px;"><strong>Table :</strong> ${table.label}</p>` : ''}
          </div>
          <p style="color: #666; font-size: 14px; line-height: 1.7;">
            En cas d'empêchement, merci de nous prévenir au <strong>+33 1 42 00 00 00</strong>.
          </p>
          <p style="margin-top: 40px; color: #888; font-size: 13px;">À très bientôt,<br/>L'équipe de L'Orfèvre</p>
        </div>
      `
    })

    // Notification au restaurateur
    await resend.emails.send({
      from: "BurstFlow <reservations@burstflow.fr>",
      to: notificationEmail,
      subject: `🔔 Nouvelle réservation — ${nom} · ${new Date(date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} à ${heure}`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 500px; margin: 0 auto; padding: 32px 20px; color: #1a1a1a;">
          <p style="font-size: 12px; color: #999; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 24px;">L'Orfèvre · Nouvelle réservation</p>
          <h2 style="font-size: 22px; font-weight: 700; margin: 0 0 24px;">${nom}</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #666; font-size: 14px; width: 120px;">Date</td><td style="padding: 8px 0; font-size: 14px; font-weight: 600;">${new Date(date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</td></tr>
            <tr><td style="padding: 8px 0; color: #666; font-size: 14px;">Heure</td><td style="padding: 8px 0; font-size: 14px; font-weight: 600;">${heure}</td></tr>
            <tr><td style="padding: 8px 0; color: #666; font-size: 14px;">Couverts</td><td style="padding: 8px 0; font-size: 14px; font-weight: 600;">${personnes} personne${nbPersonnes > 1 ? 's' : ''}</td></tr>
            <tr><td style="padding: 8px 0; color: #666; font-size: 14px;">Email</td><td style="padding: 8px 0; font-size: 14px;">${email}</td></tr>
            ${telephone ? `<tr><td style="padding: 8px 0; color: #666; font-size: 14px;">Téléphone</td><td style="padding: 8px 0; font-size: 14px;">${telephone}</td></tr>` : ''}
            ${table ? `<tr><td style="padding: 8px 0; color: #666; font-size: 14px;">Table assignée</td><td style="padding: 8px 0; font-size: 14px; font-weight: 600;">${table.label}</td></tr>` : ''}
            ${message ? `<tr><td style="padding: 8px 0; color: #666; font-size: 14px; vertical-align: top;">Message</td><td style="padding: 8px 0; font-size: 14px; font-style: italic;">"${message}"</td></tr>` : ''}
          </table>
        </div>
      `
    })
  } catch (emailError) {
    console.error('Email error:', emailError)
  }

  return NextResponse.json({ success: true, table: table?.label ?? null })
}
