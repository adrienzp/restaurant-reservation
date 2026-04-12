import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import Anthropic from '@anthropic-ai/sdk'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function envoyerReponseIA(nom: string, email: string, score: number, comment: string, date: string) {
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
    const resend = new Resend(process.env.RESEND_API_KEY!)

    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 350,
      messages: [{
        role: 'user',
        content: `Tu es le directeur de L'Orfèvre, un restaurant gastronomique parisien raffiné.
Un client nommé ${nom} a laissé un avis ${score}/5 étoiles après sa visite du ${new Date(date + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}.
${comment ? `Son commentaire : "${comment}"` : 'Il n\'a pas laissé de commentaire.'}

Rédige une réponse personnalisée en français (3-4 phrases maximum).
- Commence par saluer ${nom} chaleureusement
- Excuse-toi sincèrement et adresse le problème spécifique s'il y en a un
- Montre que tu prends ce retour très au sérieux
- Propose de les recontacter ou de les accueillir à nouveau pour leur offrir une meilleure expérience
- Ton : professionnel, sincère, chaleureux, jamais défensif
- Signe avec "L'équipe de L'Orfèvre"
Réponds uniquement avec le corps de l'email, sans objet ni mise en forme HTML.`
      }]
    })

    const reponse = msg.content[0].type === 'text' ? msg.content[0].text : ''

    await resend.emails.send({
      from: "L'Orfèvre <reservations@burstflow.fr>",
      to: email,
      subject: "Notre réponse à votre avis — L'Orfèvre",
      html: `
        <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; padding: 40px 20px; color: #1a1a1a; background: #faf9f7;">
          <h1 style="font-size: 26px; font-weight: normal; margin-bottom: 6px;">L'Orfèvre</h1>
          <p style="color: #888; font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 36px;">Réponse à votre avis</p>
          <div style="white-space: pre-line; line-height: 1.8; color: #333; font-size: 15px;">${reponse}</div>
        </div>
      `
    })
  } catch (e) {
    console.error('Erreur réponse IA:', e)
  }
}

export async function POST(req: NextRequest) {
  const { token, score, comment } = await req.json()

  if (!token || !score || score < 1 || score > 5) {
    return NextResponse.json({ error: 'Données invalides' }, { status: 400 })
  }

  const supabase = getSupabase()

  // Récupérer la réservation via le token
  const { data: reservation, error: resaError } = await supabase
    .from('reservations')
    .select('id, nom, email, date, restaurant_id')
    .eq('feedback_token', token)
    .single()

  if (resaError || !reservation) {
    return NextResponse.json({ error: 'Lien invalide ou expiré' }, { status: 404 })
  }

  // Vérifier si un feedback existe déjà
  const { data: existing } = await supabase
    .from('feedbacks')
    .select('id')
    .eq('reservation_id', reservation.id)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'Avis déjà soumis' }, { status: 409 })
  }

  // Récupérer le google_maps_url depuis la config du restaurant
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('config')
    .eq('id', reservation.restaurant_id)
    .single()

  const googleMapsUrl: string | null = restaurant?.config?.google_maps_url ?? null

  // Sauvegarder le feedback
  const { error: insertError } = await supabase.from('feedbacks').insert({
    restaurant_id: reservation.restaurant_id,
    reservation_id: reservation.id,
    nom: reservation.nom,
    email: reservation.email,
    score,
    comment: comment || null,
    submitted_at: new Date().toISOString(),
  })

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  // Si 1-3 étoiles → réponse IA (on attend la fin avant de répondre)
  if (score <= 3) {
    await envoyerReponseIA(reservation.nom, reservation.email, score, comment ?? '', reservation.date)
  }

  return NextResponse.json({
    success: true,
    score,
    google_maps_url: score >= 4 ? googleMapsUrl : null,
  })
}

// Validation du token (GET) — pour pré-charger la page
export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Token manquant' }, { status: 400 })

  const supabase = getSupabase()
  const { data: reservation } = await supabase
    .from('reservations')
    .select('id, nom, date, heure, personnes')
    .eq('feedback_token', token)
    .single()

  if (!reservation) return NextResponse.json({ error: 'Lien invalide' }, { status: 404 })

  const { data: existing } = await supabase
    .from('feedbacks')
    .select('id')
    .eq('reservation_id', reservation.id)
    .maybeSingle()

  return NextResponse.json({
    valid: true,
    already_submitted: !!existing,
    nom: reservation.nom,
    date: reservation.date,
    heure: reservation.heure,
    personnes: reservation.personnes,
  })
}
