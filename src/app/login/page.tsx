'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Scissors, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createBrowserClient } from '@supabase/ssr'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })
      
      if (authError) {
        setError('Email ou password incorretos.')
        setLoading(false)
        return
      }

      // O truque de mestre: esperar meio segundo para garantir que o Supabase grava o cookie no browser!
      await new Promise(resolve => setTimeout(resolve, 500))

      const { data: business } = await supabase
        .from('businesses')
        .select('id')
        .eq('owner_id', data.user.id)
        .limit(1)
        .maybeSingle()
      
      if (business) {
        window.location.href = `/dashboard/${business.id}`
      } else {
        window.location.href = '/dashboard'
      }
    } catch (err: any) {
      setError('Erro crítico de sistema.')
      setLoading(false)
    }
  }
  return (
    <div className="min-h-screen flex items-center justify-center bg-background/50 relative overflow-hidden p-4">
      {/* Background gradients */}
      <div className="absolute top-[-10%] right-[-5%] w-[40vw] h-[40vw] rounded-full bg-primary/20 blur-[120px]" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[40vw] h-[40vw] rounded-full bg-secondary/20 blur-[120px]" />

      <div className="w-full max-w-md bg-card/60 backdrop-blur-3xl border border-border/30 rounded-3xl p-8 shadow-2xl relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 mb-4">
            <Scissors size={24} className="text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Bem-vindo de volta</h1>
          <p className="text-muted-foreground text-sm mt-1">Aceda ao seu painel de gestão</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider ml-1">Email</label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="seu@email.com"
              required 
              className="h-12 rounded-xl bg-background/50 border-border/50 focus-visible:ring-primary/30"
            />
          </div>
          
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider ml-1">Password</label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              required 
              className="h-12 rounded-xl bg-background/50 border-border/50 focus-visible:ring-primary/30"
            />
          </div>

          {error && (
            <div className="bg-destructive/10 text-destructive text-sm font-semibold rounded-lg p-3 text-center border border-destructive/20 animate-in fade-in zoom-in duration-300">
              {error}
            </div>
          )}

          <Button disabled={loading} type="submit" className="w-full h-12 rounded-xl font-bold text-base mt-4 shadow-lg shadow-primary/20 transition-all hover:bg-primary/90">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                A Entrar...
              </>
            ) : (
              'Entrar no Painel'
            )}
          </Button>

          <p className="text-center text-xs text-muted-foreground/50 pt-1">
            Ainda não tem conta?{' '}
            <Link href="/register" className="text-primary hover:underline font-medium">
              Criar barbearia grátis
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
