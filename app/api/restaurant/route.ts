import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(req: NextRequest) {
  const slug = new URL(req.url).searchParams.get('slug')
  if (!slug) return NextResponse.json({ error: 'slug manquant' }, { status: 400 })

  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('restaurants')
    .select('id, nom, slug')
    .eq('slug', slug)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Restaurant introuvable' }, { status: 404 })
  return NextResponse.json(data)
}
