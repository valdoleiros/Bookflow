'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Scissors, Loader2, CheckCircle, AlertCircle, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createBrowserClient } from '@supabase/ssr'

function toSlug(str: string) {
  return str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)
}

function useSupabase() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}

// ── Business setup form (used in both the full form and the returning-user form) ──
function BusinessSetupFields({ name, slug, phone, slugManual, onName, onSlug, onPhone, onSlugManual }: {
  name: string; slug: string; phone: string; slugManual: boolean
  onName: (v: string) => void; onSlug: (v: string) => void; onPhone: (v: string) => void; onSlugManual: (v: boolean) => void
}) {
  return (
    <>
      <div className="space-y-1">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider ml-1">Nome da barbearia *</label>
        <Input type="text" value={name} onChange={e => onName(e.target.value)} placeholder="Ex: Barbearia do Zé" required
          className="h-12 rounded-xl bg-background/50 border-border/50 focus-visible:ring-primary/30" />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider ml-1">Endereço da sua página *</label>
        <div className="flex items-center rounded-xl bg-background/50 border border-border/50 overflow-hidden h-12 focus-within:ring-2 focus-within:ring-primary/30">
          <span className="text-muted-foreground/60 text-sm px-3 shrink-0">bookflow.pt/</span>
          <input type="text" value={slug} onChange={e => { onSlugManual(true); onSlug(toSlug(e.target.value) || e.target.value.toLowerCase()) }}
            placeholder="barbearia-ze" required minLength={3}
            className="flex-1 bg-transparent text-sm text-foreground outline-none pr-3 placeholder:text-muted-foreground/40" />
        </div>
        {slug && <p className="text-[11px] text-muted-foreground/50 ml-1">Os clientes marcam em: <span className="text-primary/70">bookflow.pt/{slug}</span></p>}
      </div>

      <div className="space-y-1">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider ml-1">Telefone (opcional)</label>
        <Input type="tel" value={phone} onChange={e => onPhone(e.target.value)} placeholder="+351 912 345 678"
          className="h-12 rounded-xl bg-background/50 border-border/50 focus-visible:ring-primary/30" />
      </div>
    </>
  )
}

export default function RegisterPage() {
  const [mode, setMode] = useState<'loading' | 'account' | 'email_sent' | 'setup'>('loading')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [sessionToken, setSessionToken] = useState('')

  // Account fields
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')

  // Business fields
  const [businessName, setBusinessName] = useState('')
  const [slug, setSlug]                 = useState('')
  const [slugManual, setSlugManual]     = useState(false)
  const [phone, setPhone]               = useState('')

  const supabase = useSupabase()

  // Sync slug from business name
  useEffect(() => {
    if (!slugManual) setSlug(toSlug(businessName))
  }, [businessName, slugManual])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { setMode('account'); return }
      const { data: biz } = await supabase.from('businesses').select('id').eq('owner_id', session.user.id).maybeSingle()
      if (biz) { window.location.href = `/dashboard/${biz.id}`; return }
      setSessionToken(session.access_token)
      setMode('setup')
    })
  }, [])

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (slug.length < 3) { setError('O endereço deve ter pelo menos 3 caracteres.'); return }
    setLoading(true); setError(null)

    const { data, error: signUpError } = await supabase.auth.signUp({ email, password })

    if (signUpError?.message === 'User already registered') {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) {
        setError('Este email já está registado com outra password.')
        setLoading(false); return
      }
      if (signInData.session) await createBusiness(signInData.session.access_token)
      setLoading(false); return
    }

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false); return
    }

    if (data.session) {
      await createBusiness(data.session.access_token)
    } else {
      setMode('email_sent')
    }
    setLoading(false)
  }

  const createBusiness = async (accessToken: string) => {
    setLoading(true); setError(null)
    const res = await fetch('/api/businesses/setup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ name: businessName, slug, phone, timezone: 'Europe/Lisbon' }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Erro ao criar barbearia.'); setLoading(false); return }
    window.location.href = `/dashboard/${data.businessId}`
  }

  if (mode === 'loading') {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 size={24} className="animate-spin text-muted-foreground/30" /></div>
  }

  // ── Email sent — waiting for confirmation ──
  if (mode === 'email_sent') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background/50 p-4">
        <div className="w-full max-w-md bg-card/60 backdrop-blur-3xl border border-border/30 rounded-3xl p-8 text-center shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Mail size={24} className="text-primary" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Verifica o teu email</h2>
          <p className="text-muted-foreground text-sm mb-2">
            Enviámos um link de confirmação para <strong className="text-foreground">{email}</strong>.
          </p>
          <p className="text-muted-foreground/60 text-xs mb-6">
            Clica no link para activar a conta e completar a criação da tua barbearia. Em dev, vê o email no <a href="http://127.0.0.1:54324" target="_blank" className="text-primary/70 hover:underline">Mailpit</a>.
          </p>
          <p className="text-xs text-muted-foreground/40">Depois de confirmares, volta a esta página e terás acesso à configuração da barbearia.</p>
        </div>
      </div>
    )
  }

  // ── Returning user — business setup only ──
  if (mode === 'setup') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background/50 relative overflow-hidden p-4">
        <div className="absolute top-[-10%] right-[-5%] w-[40vw] h-[40vw] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[40vw] h-[40vw] rounded-full bg-secondary/20 blur-[120px]" />
        <div className="w-full max-w-md bg-card/60 backdrop-blur-3xl border border-border/30 rounded-3xl p-8 shadow-2xl relative z-10">
          <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 mb-4">
              <Scissors size={24} className="text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Configura a tua barbearia</h1>
            <p className="text-muted-foreground text-sm mt-1">Conta criada! Dá um nome à tua barbearia.</p>
          </div>
          <div className="space-y-4">
            <BusinessSetupFields name={businessName} slug={slug} phone={phone} slugManual={slugManual}
              onName={setBusinessName} onSlug={setSlug} onPhone={setPhone} onSlugManual={setSlugManual} />
            {error && (
              <div className="bg-destructive/10 text-destructive text-sm rounded-xl p-3 flex items-center gap-2 border border-destructive/20">
                <AlertCircle size={15} className="shrink-0" />{error}
              </div>
            )}
            <Button onClick={() => createBusiness(sessionToken)} disabled={loading || !businessName.trim() || slug.length < 3}
              className="w-full h-12 rounded-xl font-bold text-base shadow-lg shadow-primary/20">
              {loading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />A criar...</> : 'Criar Barbearia →'}
            </Button>
            <button
              onClick={async () => { await supabase.auth.signOut(); window.location.href = '/register' }}
              className="w-full text-xs text-muted-foreground/50 hover:text-muted-foreground text-center py-1 transition-colors"
            >
              Usar outra conta
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Default — full account + business creation form ──
  return (
    <div className="min-h-screen flex items-center justify-center bg-background/50 relative overflow-hidden p-4">
      <div className="absolute top-[-10%] right-[-5%] w-[40vw] h-[40vw] rounded-full bg-primary/20 blur-[120px]" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[40vw] h-[40vw] rounded-full bg-secondary/20 blur-[120px]" />
      <div className="w-full max-w-md bg-card/60 backdrop-blur-3xl border border-border/30 rounded-3xl p-8 shadow-2xl relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 mb-4">
            <Scissors size={24} className="text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Criar a sua barbearia</h1>
          <p className="text-muted-foreground text-sm mt-1">Gratuito para começar, sem cartão</p>
        </div>

        <form onSubmit={handleSignUp} className="space-y-4">
          <BusinessSetupFields name={businessName} slug={slug} phone={phone} slugManual={slugManual}
            onName={setBusinessName} onSlug={setSlug} onPhone={setPhone} onSlugManual={setSlugManual} />

          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider ml-1">Email *</label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" required
              className="h-12 rounded-xl bg-background/50 border-border/50 focus-visible:ring-primary/30" />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider ml-1">Password *</label>
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres" required minLength={8}
              className="h-12 rounded-xl bg-background/50 border-border/50 focus-visible:ring-primary/30" />
          </div>

          {error && (
            <div className="bg-destructive/10 text-destructive text-sm rounded-xl p-3 flex items-center gap-2 border border-destructive/20 animate-in fade-in zoom-in duration-300">
              <AlertCircle size={16} className="shrink-0" />{error}
            </div>
          )}

          <Button type="submit" disabled={loading || !businessName.trim() || !email.trim() || !password.trim()}
            className="w-full h-12 rounded-xl font-bold text-base mt-2 shadow-lg shadow-primary/20">
            {loading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />A criar...</> : 'Criar Barbearia Grátis →'}
          </Button>

          <p className="text-center text-[11px] text-muted-foreground/40 leading-relaxed">
            Ao criar conta aceita os{' '}
            <Link href="/termos" target="_blank" className="text-primary/60 hover:underline">Termos de Serviço</Link>
            {' '}e o{' '}
            <Link href="/dpa" target="_blank" className="text-primary/60 hover:underline">Contrato de Subcontratante</Link>.
          </p>

          <p className="text-center text-xs text-muted-foreground/50 pt-1">
            Já tem conta?{' '}<Link href="/login" className="text-primary hover:underline font-medium">Fazer login</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
