import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const formData = await request.formData()
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const cookieStore = cookies()
  const pendingCookies: Array<{ name: string; value: string; options: any }> = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet: Array<{ name: string; value: string; options: any }>) {
          pendingCookies.push(...cookiesToSet)
        },
      },
    }
  )

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return NextResponse.redirect(new URL('/login?error=true', request.url), { status: 303 })
  }

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', data.user.id)
    .limit(1)
    .maybeSingle()

  const finalUrl = business ? `/dashboard/${business.id}` : '/dashboard'
  const response = NextResponse.redirect(new URL(finalUrl, request.url), { status: 303 })

  pendingCookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options))

  return response
}
