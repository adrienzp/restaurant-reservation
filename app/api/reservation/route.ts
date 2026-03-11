import { Resend } from 'resend'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const resend = new Resend(process.env.RESEND_API_KEY)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: Request) {
  const body = await req.json()

  const { error } = await supabase.from('reservations').insert([body])
  if (error) return NextResponse.json({ error }, { status: 500 })

  await resend.emails.send({
    from: 'onboarding@resend.dev',
    to: body.email,
    subject: '✅ Votre réservation est bien reçue !',
    html: `
      <h2>Bonjour ${body.nom} !</h2>
      <p>Nous avons bien reçu votre demande de réservation.</p>
      <ul>
        <li><strong>Date :</strong> ${body.date}</li>
        <li><strong>Heure :</strong> ${body.heure}</li>
        <li><strong>Personnes :</strong> ${body.personnes}</li>
      </ul>
      <p>Nous vous contacterons rapidement pour confirmer votre table.</p>
      <p>À très bientôt !</p>
    `
  })

  return NextResponse.json({ success: true })
}