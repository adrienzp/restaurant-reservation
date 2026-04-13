import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'public, max-age=60',
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = getSupabase()

  const { data: restaurant, error } = await supabase
    .from('restaurants')
    .select('id, nom, config')
    .eq('slug', slug)
    .single()

  if (error || !restaurant) {
    return NextResponse.json({ error: 'Restaurant introuvable' }, { status: 404, headers: CORS })
  }

  const { data: events } = await supabase
    .from('events')
    .select('id, title, description, image_url, registration_url, starts_at, ends_at, show_popup, capacity')
    .eq('restaurant_id', restaurant.id)
    .eq('active', true)
    .order('starts_at', { ascending: true })

  return NextResponse.json({
    nom: restaurant.nom,
    horaires: (restaurant.config as Record<string, unknown>)?.daily_schedule ?? null,
    events: events ?? [],
  }, { headers: CORS })
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}
