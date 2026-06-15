'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Minus, Euro, CalendarCheck, Scissors, Loader2, UserCheck, AlertTriangle, Users, Clock } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Card } from '@/components/ui/card'
import clsx from 'clsx'

interface Stats {
  revenueThisMonth: number; revenueLastMonth: number
  bookingsThisMonth: number; bookingsLastMonth: number
  monthlyRevenue: { label: string; revenue: number; count: number }[]
  topServices:    { name: string; count: number; revenue: number }[]
  revenueByStaff: { name: string; count: number; revenue: number }[]
  noShowRate:     number; noShowCount: number
  retentionRate:  number; totalCustomers: number
  peakHours:      { hour: number; count: number }[]
}

function Delta({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) return null
  const pct = Math.round(((current - previous) / previous) * 100)
  if (pct === 0) return <span className="text-xs text-muted-foreground/50 flex items-center gap-1"><Minus size={11} /> igual</span>
  const up = pct > 0
  return (
    <span className={clsx('flex items-center gap-1 text-xs font-semibold', up ? 'text-green-400' : 'text-destructive')}>
      {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
      {up ? '+' : ''}{pct}%
    </span>
  )
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border/40 rounded-xl px-3 py-2 shadow-xl text-xs">
      <p className="font-bold text-foreground mb-1">{label}</p>
      <p className="text-primary">{payload[0]?.value?.toFixed(2)}€</p>
      <p className="text-muted-foreground">{payload[0]?.payload?.count} marcações</p>
    </div>
  )
}

export function ReportsTab({ businessId }: { businessId: string }) {
  const [stats, setStats]   = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/dashboard/${businessId}/stats`)
      .then(r => r.json()).then(setStats).catch(console.error).finally(() => setLoading(false))
  }, [businessId])

  if (loading) return (
    <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground/50">
      <Loader2 size={18} className="animate-spin" /><span className="text-sm">A carregar...</span>
    </div>
  )
  if (!stats) return <p className="text-center text-muted-foreground/50 py-12 text-sm">Erro ao carregar dados.</p>

  const maxRevenue = Math.max(...stats.monthlyRevenue.map(m => m.revenue), 1)

  return (
    <div className="space-y-5">
      <h2 className="text-muted-foreground text-xs font-semibold uppercase tracking-widest">Relatórios Financeiros</h2>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: Euro,         color: 'text-primary',    bg: 'bg-primary/10',    label: 'Receita este mês', value: `${stats.revenueThisMonth.toFixed(2)}€`,   delta: <Delta current={stats.revenueThisMonth} previous={stats.revenueLastMonth} /> },
          { icon: CalendarCheck,color: 'text-blue-400',   bg: 'bg-blue-500/10',   label: 'Marcações',        value: stats.bookingsThisMonth,                    delta: <Delta current={stats.bookingsThisMonth} previous={stats.bookingsLastMonth} /> },
          { icon: UserCheck,    color: 'text-purple-400', bg: 'bg-purple-500/10', label: 'Retenção',         value: `${stats.retentionRate}%`,                  delta: null },
          { icon: AlertTriangle,color: stats.noShowRate > 15 ? 'text-amber-400' : 'text-muted-foreground/50', bg: stats.noShowRate > 15 ? 'bg-amber-500/10' : 'bg-muted/20', label: 'Taxa de faltas', value: `${stats.noShowRate}%`, delta: null },
        ].map(({ icon: Icon, color, bg, label, value, delta }) => (
          <Card key={label} className="bg-card/40 border-border/30 rounded-2xl p-4 shadow-none">
            <div className={clsx('w-8 h-8 rounded-xl flex items-center justify-center mb-2', bg)}>
              <Icon size={14} className={color} />
            </div>
            <p className="text-2xl font-bold text-foreground mb-0.5">{value}</p>
            <p className="text-xs text-muted-foreground/60">{label}</p>
            {delta && <div className="mt-1">{delta}</div>}
          </Card>
        ))}
      </div>

      {/* Monthly bar chart */}
      <Card className="bg-card/40 border-border/30 rounded-2xl p-5 shadow-none">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Receita — últimos 6 meses</p>
        {stats.monthlyRevenue.every(m => m.revenue === 0) ? (
          <div className="flex flex-col items-center py-10 text-muted-foreground/30">
            <Euro size={28} className="mb-2" /><p className="text-xs">Sem dados ainda</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={stats.monthlyRevenue} barCategoryGap="30%">
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))', opacity: 0.6 }} />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3, radius: 6 }} />
              <Bar dataKey="revenue" radius={[6,6,0,0]} maxBarSize={40}>
                {stats.monthlyRevenue.map((e, i) => <Cell key={i} fill={e.revenue === maxRevenue ? 'hsl(var(--primary))' : 'hsl(var(--primary) / 0.35)'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Top services */}
      {stats.topServices.length > 0 && (
        <Card className="bg-card/40 border-border/30 rounded-2xl p-5 shadow-none">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2"><Scissors size={12} />Serviços mais populares</p>
          <div className="space-y-3">
            {stats.topServices.map((svc, i) => {
              const pct = Math.round((svc.count / stats.topServices[0].count) * 100)
              return (
                <div key={svc.name} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground flex items-center gap-2">
                      <span className="text-muted-foreground/40 text-xs font-mono w-4">{i + 1}</span>{svc.name}
                    </span>
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      <span>{svc.count}×</span><span className="font-semibold text-primary">{svc.revenue.toFixed(2)}€</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-muted/40 rounded-full"><div className="h-full bg-primary/60 rounded-full" style={{ width: `${pct}%` }} /></div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Revenue by staff + Peak hours side by side */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {stats.revenueByStaff.length > 0 && (
          <Card className="bg-card/40 border-border/30 rounded-2xl p-5 shadow-none">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2"><Users size={12} />Receita por barbeiro</p>
            <div className="space-y-2.5">
              {stats.revenueByStaff.map(s => (
                <div key={s.name} className="flex justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">{s.name.charAt(0)}</div>
                    <span className="text-foreground">{s.name}</span>
                  </div>
                  <span className="font-semibold text-primary text-xs">{s.revenue.toFixed(2)}€</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {stats.peakHours.length > 0 && (
          <Card className="bg-card/40 border-border/30 rounded-2xl p-5 shadow-none">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2"><Clock size={12} />Horas de pico</p>
            <div className="space-y-2.5">
              {stats.peakHours.map(h => (
                <div key={h.hour} className="flex justify-between text-sm">
                  <span className="text-foreground font-mono">{String(h.hour).padStart(2,'0')}:00</span>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-20 bg-muted/40 rounded-full overflow-hidden">
                      <div className="h-full bg-primary/60 rounded-full" style={{ width: `${(h.count / stats.peakHours[0].count) * 100}%` }} />
                    </div>
                    <span className="text-muted-foreground text-xs w-8 text-right">{h.count}×</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Footer summary */}
      <Card className="bg-card/20 border-border/20 rounded-2xl p-4 shadow-none">
        <p className="text-xs text-muted-foreground/50 text-center">
          {stats.totalCustomers} clientes · {stats.noShowCount} faltas nos últimos 6 meses · mês anterior: <span className="text-foreground font-semibold">{stats.revenueLastMonth.toFixed(2)}€</span>
        </p>
      </Card>
    </div>
  )
}
