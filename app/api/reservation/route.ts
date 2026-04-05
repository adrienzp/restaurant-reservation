import { Resend } from 'resend'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: Request) {
  const body = await req.json()
  const { nom, email, telephone, personnes, date, heure, message } = body

  if (!nom || !email || !date || !heure || !personnes) {
    return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { error: insertError } = await supabase.from('reservations').insert([{
    nom,
    email,
    telephone,
    nb_personnes: parseInt(personnes),
    date_reservation: date,
    heure_reservation: heure,
    message,
    statut: 'en attente',
  }])

  if (insertError) {
    console.error('Supabase insert error:', insertError)
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  try {
    await resend.emails.send({
      from: "L'Orfèvre <reservations@burstflow.fr>",
      to: email,
      subject: "✅ Votre réservation est confirmée — L'Orfèvre",
      html: `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #1a1a1a;">
          <h1 style="font-size: 28px; font-weight: normal; margin-bottom: 8px;">L'Orfèvre</h1>
          <p style="color: #666; margin-bottom: 32px; font-size: 14px; letter-spacing: 0.1em; text-transform: uppercase;">Confirmation de réservation</p>
          <p style="font-size: 18px; margin-bottom: 24px;">Bonjour ${nom},</p>
          <p style="color: #444; line-height: 1.7; margin-bottom: 32px;">Nous avons bien reçu votre réservation et nous sommes ravis de vous accueillir prochainement.</p>
          <div style="background: #f9f7f4; border-left: 3px solid #c9a96e; padding: 24px; margin-bottom: 32px;">
            <p style="margin: 0 0 8px; font-size: 14px; color: #888; text-transform: uppercase; letter-spacing: 0.1em;">Détails</p>
            <p style="margin: 4px 0; font-size: 16px;"><strong>Date :</strong> ${new Date(date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            <p style="margin: 4px 0; font-size: 16px;"><strong>Heure :</strong> ${heure}</p>
            <p style="margin: 4px 0; font-size: 16px;"><strong>Couverts :</strong> ${personnes} personne${parseInt(personnes) > 1 ? 's' : ''}</p>
          </div>
          <p style="color: #666; font-size: 14px; line-height: 1.7;">En cas d'empêchement, merci de nous prévenir au <strong>+33 1 42 00 00 00</strong>.</p>
          <p style="margin-top: 40px; color: #888; font-size: 13px;">À très bientôt,<br/>L'équipe de L'Orfèvre</p>
        </div>
      `
    })
  } catch (emailError) {
    console.error('Email error:', emailError)
  }

  return NextResponse.json({ success: true })
}