import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(req: NextRequest) {
  // Vérification sécurité cron
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const supabase = getSupabase()
  const resend = new Resend(process.env.RESEND_API_KEY!)

  // Hier (au format YYYY-MM-DD)
  const hier = new Date()
  hier.setDate(hier.getDate() - 1)
  const dateHier = hier.toISOString().slice(0, 10)

  // Réservations d'hier non annulées sans email feedback envoyé
  const { data: reservations, error } = await supabase
    .from('reservations')
    .select('id, nom, email, date, heure, personnes, feedback_token')
    .eq('date', dateHier)
    .neq('statut', 'annulée')
    .is('feedback_sent_at', null)
    .not('email', 'is', null)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!reservations || reservations.length === 0) {
    return NextResponse.json({ sent: 0 })
  }

  let sent = 0
  for (const r of reservations) {
    const feedbackUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://restaurant-reservation-9r5p.vercel.app'}/feedback/${r.feedback_token}`
    try {
      await resend.emails.send({
        from: "L'Orfèvre <reservations@burstflow.fr>",
        to: r.email,
        subject: "Votre avis compte pour nous — L'Orfèvre",
        html: `
          <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; padding: 40px 20px; color: #1a1a1a; background: #faf9f7;">
            <h1 style="font-size: 26px; font-weight: normal; margin-bottom: 6px;">L'Orfèvre</h1>
            <p style="color: #888; font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 36px;">Merci pour votre visite</p>
            <p style="font-size: 17px; margin-bottom: 16px;">Bonjour ${r.nom},</p>
            <p style="color: #444; line-height: 1.8; margin-bottom: 32px;">
              Nous espérons que votre dîner d'hier soir était à la hauteur de vos attentes.<br/>
              Votre avis est précieux pour nous aider à nous améliorer.
            </p>
            <div style="text-align: center; margin: 40px 0;">
              <a href="${feedbackUrl}" style="background: #1a1a1a; color: #fff; padding: 16px 40px; text-decoration: none; font-family: system-ui, sans-serif; font-size: 13px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; border-radius: 3px;">
                Laisser un avis
              </a>
            </div>
            <p style="color: #aaa; font-size: 13px; text-align: center;">Cela ne prend que 30 secondes.</p>
            <p style="margin-top: 48px; color: #888; font-size: 13px;">À très bientôt,<br/>L'équipe de L'Orfèvre</p>
          </div>
        `
      })

      await supabase
        .from('reservations')
        .update({ feedback_sent_at: new Date().toISOString() })
        .eq('id', r.id)

      sent++
    } catch (e) {
      console.error(`Feedback email failed for ${r.email}:`, e)
    }
  }

  return NextResponse.json({ sent, date: dateHier })
}
