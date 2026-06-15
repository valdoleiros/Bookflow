'use client'

import { useState, useEffect, useCallback } from 'react'
import { format, parseISO, isToday, isTomorrow, addDays } from 'date-fns'
import { pt } from 'date-fns/locale'
import { toZonedTime } from 'date-fns-tz'
import {
  Calendar, Clock, Phone, Scissors, Link2, RefreshCw,
  Plus, XCircle, ChevronRight, ChevronLeft,
  BarChart3, LayoutGrid, Loader2, Check, Users, Trash2, Settings2, Pencil, LogOut, ImagePlus
} from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'
import clsx from 'clsx'

import { ManualBookingDialog } from './manual-booking-dialog'
import { ReportsTab } from './reports-tab'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface Business {
  id: string; name: string; phone: string | null; slug: string; timezone: string
  address?: string | null; description?: string | null; cover_url?: string | null; logo_url?: string | null
  brand_color?: string | null
  prepayment_mode?: string | null; prepayment_value?: number | null
}
interface Service { id: string; name: string; duration_minutes: number; price: number | null; is_active: boolean }
interface Availability { id: string; business_id: string; day_of_week: number; start_hour: string; end_hour: string; is_active: boolean }
interface Customer { id: string; name: string; phone: string; email: string | null }
interface BookingWithDetails {
  id: string; start_time: string; end_time: string; status: string
  services: Service; customers: Customer; staff: { id: string; name: string } | null
}

const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
type Tab = 'agenda' | 'services' | 'schedule' | 'customers' | 'team' | 'reports' | 'settings'

export default function DashboardClient({
  business, services: initServices, availability: initAvail
}: { business: Business; services: Service[]; availability: Availability[] }) {

  const [tab, setTab] = useState<Tab>('agenda')
  const [bookings, setBookings] = useState<BookingWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [services, setServices] = useState(initServices)
  const [cancelling, setCancelling] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDuration, setNewDuration] = useState('30')
  const [newPrice, setNewPrice] = useState('')
  const [savingSvc, setSavingSvc] = useState(false)
  const [availability, setAvailability] = useState(initAvail)
  const [savingSchedule, setSavingSchedule] = useState(false)
  const [savedSchedule, setSavedSchedule] = useState(false)
  const [currentPage, setCurrentPage] = useState(0)
  const [daysPerPage, setDaysPerPage] = useState(4)
  const [customers, setCustomers] = useState<any[]>([])
  const [loadingCustomers, setLoadingCustomers] = useState(false)
  const [isManualBookingOpen, setIsManualBookingOpen] = useState(false)

  useEffect(() => {
    if (tab === 'customers' && customers.length === 0) {
      const fetchCustomers = async () => {
        setLoadingCustomers(true)
        try {
          const res = await fetch(`/api/dashboard/${business.id}/customers`)
          const data = await res.json()
          setCustomers(data.customers ?? [])
        } catch (e) {
          console.error(e)
        } finally {
          setLoadingCustomers(false)
        }
      }
      fetchCustomers()
    }
  }, [tab, business.id, customers.length])

  const [closedPeriods, setClosedPeriods] = useState<any[]>([])
  const [loadingClosed, setLoadingClosed] = useState(false)
  const [newClosedDate, setNewClosedDate] = useState('')
  const [newClosedStart, setNewClosedStart] = useState('')
  const [newClosedEnd, setNewClosedEnd] = useState('')
  const [savingClosed, setSavingClosed] = useState(false)

  const [staff, setStaff] = useState<any[]>([])
  const [newStaffName, setNewStaffName] = useState('')
  const [savingStaff, setSavingStaff] = useState(false)

  const [editingServiceId, setEditingServiceId] = useState<string | null>(null)
  const [editSvcName, setEditSvcName] = useState('')
  const [editSvcDuration, setEditSvcDuration] = useState('30')
  const [editSvcPrice, setEditSvcPrice] = useState('')
  const [savingEditSvc, setSavingEditSvc] = useState(false)

  const [settingsLogoUrl, setSettingsLogoUrl] = useState(business.logo_url ?? '')
  const [settingsBrandColor, setSettingsBrandColor] = useState(business.brand_color ?? '')
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)

  const [settingsName, setSettingsName] = useState(business.name)
  const [settingsPhone, setSettingsPhone] = useState(business.phone ?? '')
  const [settingsTimezone, setSettingsTimezone] = useState(business.timezone)
  const [settingsAddress, setSettingsAddress] = useState(business.address ?? '')
  const [settingsDescription, setSettingsDescription] = useState(business.description ?? '')
  const [settingsCoverUrl, setSettingsCoverUrl] = useState(business.cover_url ?? '')
  // Pré-pagamento: 'off' | 'full' | 'deposit_fixed' | 'deposit_percent'
  const [prepayMode, setPrepayMode]   = useState<string>(business.prepayment_mode ?? 'off')
  const [prepayValue, setPrepayValue] = useState(business.prepayment_value != null ? String(business.prepayment_value) : '')
  const [savingSettings, setSavingSettings] = useState(false)
  const [savedSettings, setSavedSettings] = useState(false)
  const [scheduleStaffId, setScheduleStaffId] = useState<string | null>(null) // null = Geral

  useEffect(() => {
    if (tab === 'schedule') {
      const fetchClosed = async () => {
        setLoadingClosed(true)
        try {
          const res = await fetch(`/api/availability/closed-periods?business_id=${business.id}`)
          const data = await res.json()
          setClosedPeriods(data.closed_periods ?? [])
        } catch (e) {
          console.error(e)
        } finally {
          setLoadingClosed(false)
        }
      }
      fetchClosed()
    }
  }, [tab, business.id])

  useEffect(() => {
    if (tab === 'schedule' || tab === 'team' || isManualBookingOpen) {
      if (staff.length > 0) return
      const fetchStaff = async () => {
        try {
          const res = await fetch(`/api/staff?business_id=${business.id}`)
          const data = await res.json()
          setStaff(data.staff ?? [])
        } catch (e) {
          console.error(e)
        }
      }
      fetchStaff()
    }
  }, [tab, isManualBookingOpen, business.id, staff.length])

  useEffect(() => {
    const handleResize = () => setDaysPerPage(window.innerWidth >= 1280 ? 4 : (window.innerWidth >= 1024 ? 3 : (window.innerWidth >= 768 ? 2 : 1)))
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const bookingLink = typeof window !== 'undefined'
    ? `${window.location.origin}/${business.slug}` : `/${business.slug}`

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/dashboard/${business.id}`)
      if (!res.ok) throw new Error('Falha de rede ao carregar marcações')
      const data = await res.json()
      setBookings(data.bookings ?? [])
    } catch (e) {
      console.error('Erro no Dashboard:', e)
      setBookings([])
    } finally {
      setLoading(false)
    }
  }, [business.id])

  useEffect(() => { fetchBookings() }, [fetchBookings])

  const handleCancel = async (id: string) => {
    if (!confirm('Cancelar esta marcação?')) return
    setCancelling(id)
    try {
      const res = await fetch(`/api/bookings/${id}/cancel`, { method: 'POST' })
      if (!res.ok) throw new Error('Falha ao cancelar')
    } catch (e) {
      alert('Erro ao cancelar a marcação. Tenta novamente.')
    }
    setCancelling(null)
    fetchBookings()
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(bookingLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    setSavingSvc(true)
    const res = await fetch('/api/services', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ business_id: business.id, name: newName.trim(), duration_minutes: parseInt(newDuration), price: newPrice ? parseFloat(newPrice) : null }),
    })
    const data = await res.json()
    if (res.ok && data.service) { setServices(p => [...p, data.service]); setNewName(''); setNewDuration('30'); setNewPrice('') }
    else if (!res.ok) { alert(data.error || 'Erro ao adicionar serviço') }
    setSavingSvc(false)
  }

  const updateDay = (dow: number, field: string, value: any) => {
    setAvailability(prev => {
      // Find rule for specific staff (or generic)
      const existing = prev.find((a: any) => a.day_of_week === dow && a.staff_id === scheduleStaffId)
      if (existing) return prev.map((a: any) => (a.day_of_week === dow && a.staff_id === scheduleStaffId) ? { ...a, [field]: value } : a)
      return [...prev, { id: `new-${dow}-${scheduleStaffId}`, business_id: business.id, staff_id: scheduleStaffId, day_of_week: dow, start_hour: '09:00', end_hour: '19:00', is_active: true, [field]: value }]
    })
  }

  const handleSaveSchedule = async () => {
    setSavingSchedule(true)
    try {
      const res = await fetch('/api/availability', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ business_id: business.id, availability }) })
      if (!res.ok) throw new Error('Falha ao guardar')
      setSavedSchedule(true)
      setTimeout(() => setSavedSchedule(false), 2500)
    } catch (e) {
      alert('Erro ao guardar horários. Tenta novamente.')
    }
    setSavingSchedule(false)
  }

  const handleAddClosedPeriod = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newClosedDate) return
    setSavingClosed(true)
    const res = await fetch('/api/availability/closed-periods', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        business_id: business.id,
        date: newClosedDate,
        start_time: newClosedStart || null,
        end_time: newClosedEnd || null,
        reason: 'Férias/Bloqueio',
        staff_id: scheduleStaffId
      })
    })
    const data = await res.json()
    if (res.ok && data.closed_period) {
      setClosedPeriods(p => [...p, data.closed_period].sort((a, b) => a.date.localeCompare(b.date)))
      setNewClosedDate('')
      setNewClosedStart('')
      setNewClosedEnd('')
    }
    setSavingClosed(false)
  }

  const handleDeleteClosedPeriod = async (id: string) => {
    if (!confirm('Remover este bloqueio?')) return
    await fetch(`/api/availability/closed-periods?id=${id}`, { method: 'DELETE' })
    setClosedPeriods(p => p.filter(c => c.id !== id))
  }

  const handleNoShow = async (id: string) => {
    if (!confirm('Marcar esta marcação como falta?')) return
    const res = await fetch(`/api/bookings/${id}/no-show`, { method: 'POST' })
    if (res.ok) fetchBookings()
    else { const d = await res.json(); alert(d.error || 'Erro') }
  }

  const handleExportCSV = () => {
    window.location.href = `/api/dashboard/${business.id}/customers/export`
  }

  const handleDeleteCustomer = async (customerId: string, name: string) => {
    if (!confirm(`Apagar todos os dados de "${name}"? (RGPD Art. 17)\n\nO histórico de marcações fica anonimizado.`)) return
    const res = await fetch(`/api/dashboard/${business.id}/customers/${customerId}`, { method: 'DELETE' })
    if (res.ok) setCustomers(p => p.filter(c => c.id !== customerId))
    else { const d = await res.json(); alert(d.error || 'Erro ao apagar dados.') }
  }

  const handleLogout = async () => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const handleImageUpload = async (file: File, kind: 'logo' | 'cover') => {
    if (!file.type.startsWith('image/')) { alert('Escolhe um ficheiro de imagem.'); return }
    if (file.size > 5 * 1024 * 1024) { alert('A imagem não pode passar de 5 MB.'); return }

    const setUploading = kind === 'logo' ? setUploadingLogo : setUploadingCover
    const setUrl = kind === 'logo' ? setSettingsLogoUrl : setSettingsCoverUrl
    setUploading(true)
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const path = `${business.id}/${kind}-${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('business-assets').upload(path, file, {
        contentType: file.type,
        upsert: true,
      })
      if (error) throw error
      const { data } = supabase.storage.from('business-assets').getPublicUrl(path)
      setUrl(data.publicUrl)
    } catch {
      alert('Erro ao enviar a imagem. Tenta novamente.')
    }
    setUploading(false)
  }

  const startEditService = (svc: Service) => {
    setEditingServiceId(svc.id)
    setEditSvcName(svc.name)
    setEditSvcDuration(String(svc.duration_minutes))
    setEditSvcPrice(svc.price != null ? String(svc.price) : '')
  }

  const handleSaveEditService = async (svc: Service) => {
    setSavingEditSvc(true)
    const res = await fetch('/api/services', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: svc.id,
        business_id: business.id,
        name: editSvcName.trim(),
        duration_minutes: parseInt(editSvcDuration),
        price: editSvcPrice ? parseFloat(editSvcPrice) : null,
      }),
    })
    const data = await res.json()
    if (res.ok && data.service) {
      setServices(p => p.map(s => s.id === svc.id ? data.service : s))
      setEditingServiceId(null)
    } else {
      alert(data.error || 'Erro ao guardar')
    }
    setSavingEditSvc(false)
  }

  const handleToggleService = async (svc: Service) => {
    const res = await fetch('/api/services', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: svc.id, business_id: business.id, is_active: !svc.is_active }),
    })
    if (res.ok) setServices(p => p.map(s => s.id === svc.id ? { ...s, is_active: !svc.is_active } : s))
  }

  const handleDeleteService = async (svc: Service) => {
    if (!confirm(`Apagar "${svc.name}"? Esta acção não pode ser desfeita.`)) return
    const res = await fetch(`/api/services?id=${svc.id}&business_id=${business.id}`, { method: 'DELETE' })
    if (res.ok) setServices(p => p.filter(s => s.id !== svc.id))
  }

  const handleToggleStaff = async (s: any) => {
    const res = await fetch('/api/staff', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: s.id, business_id: business.id, is_active: !s.is_active }),
    })
    if (res.ok) setStaff(p => p.map(m => m.id === s.id ? { ...m, is_active: !s.is_active } : m))
  }

  const handleDeleteStaff = async (s: any) => {
    if (!confirm(`Remover "${s.name}" da equipa?`)) return
    const res = await fetch(`/api/staff?id=${s.id}&business_id=${business.id}`, { method: 'DELETE' })
    if (res.ok) setStaff(p => p.filter(m => m.id !== s.id))
  }

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newStaffName.trim()) return
    setSavingStaff(true)
    try {
      const res = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business_id: business.id, name: newStaffName })
      })
      const data = await res.json()
      if (res.ok && data.staff) { setStaff(p => [...p, data.staff]); setNewStaffName('') }
      else { alert(data.error || 'Erro ao adicionar barbeiro') }
    } catch (e) {
      alert('Erro de rede ao adicionar barbeiro')
    }
    setSavingStaff(false)
  }

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingSettings(true)
    try {
      const res = await fetch(`/api/businesses/${business.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: settingsName,
          phone: settingsPhone || null,
          timezone: settingsTimezone,
          address: settingsAddress || null,
          description: settingsDescription || null,
          cover_url: settingsCoverUrl || null,
          logo_url: settingsLogoUrl || null,
          brand_color: settingsBrandColor || null,
          prepayment_mode: prepayMode,
          prepayment_value: (prepayMode === 'deposit_fixed' || prepayMode === 'deposit_percent') && prepayValue
            ? parseFloat(prepayValue)
            : null,
        }),
      })
      if (!res.ok) throw new Error('Falha ao guardar')
      setSavedSettings(true)
      setTimeout(() => setSavedSettings(false), 2500)
    } catch {
      alert('Erro ao guardar as definições. Tenta novamente.')
    }
    setSavingSettings(false)
  }

  const formatTime = (iso: string) => format(toZonedTime(parseISO(iso), business.timezone), 'HH:mm')
  const formatDateLabel = (iso: string) => {
    const d = toZonedTime(parseISO(iso), business.timezone)
    if (isToday(d)) return 'Hoje'
    if (isTomorrow(d)) return 'Amanhã'
    return format(d, "EEE, d MMM", { locale: pt })
  }

  const confirmedThisMonth = bookings.filter(b => {
    if (b.status !== 'confirmed') return false
    const bookingDate = parseISO(b.start_time)
    const now = new Date()
    return bookingDate.getMonth() === now.getMonth() && bookingDate.getFullYear() === now.getFullYear()
  }).length

  const groupedBookings = bookings.reduce((acc, booking) => {
    const tzDate = toZonedTime(parseISO(booking.start_time), business.timezone)
    const dateKey = format(tzDate, 'yyyy-MM-dd')
    if (!acc[dateKey]) acc[dateKey] = []
    acc[dateKey].push(booking)
    return acc
  }, {} as Record<string, BookingWithDetails[]>)

  const sortedDates = Object.keys(groupedBookings).sort()

  const agendaDays = Array.from({ length: 31 }).map((_, i) => {
    const d = addDays(new Date(), i)
    return format(toZonedTime(d, business.timezone), 'yyyy-MM-dd')
  })

  const maxPage = Math.max(0, Math.ceil(31 / daysPerPage) - 1)
  const startIndex = currentPage * daysPerPage
  const visibleDays = agendaDays.slice(startIndex, startIndex + daysPerPage)

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, hsl(var(--background)) 0%, hsl(var(--secondary)) 100%)' }}>

      {/* Header */}
      <header className="border-b border-border/30 bg-background/40 backdrop-blur-xl">
        <div className="w-full mx-auto px-5 py-4 md:px-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                {business.logo_url ? (
                  <img src={business.logo_url} alt={business.name} className="w-6 h-6 rounded-lg object-cover bg-card" />
                ) : (
                  <div className="w-6 h-6 rounded-lg bg-primary flex items-center justify-center">
                    <Scissors size={12} className="text-primary-foreground" />
                  </div>
                )}
                <h1 className="font-bold text-foreground text-base">{business.name}</h1>
              </div>
              <p className="text-muted-foreground/50 text-xs pl-8">Painel de gestão</p>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handleCopyLink}
                variant="outline"
                className={clsx('flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all h-auto',
                  copied ? 'bg-green-500/15 text-green-400 border-green-500/20 hover:bg-green-500/20'
                  : 'bg-card/30 text-muted-foreground border-border/40 hover:bg-card/50'
                )}>
                {copied ? <Check size={13} /> : <Link2 size={13} />}
                {copied ? 'Copiado!' : 'Copiar link'}
              </Button>
              <Button onClick={handleLogout} variant="ghost" size="icon"
                className="w-8 h-8 rounded-xl text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10">
                <LogOut size={14} />
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            {[
              { label: 'Este Mês', value: confirmedThisMonth, color: 'text-primary' },
              { label: 'Total', value: bookings.length, color: 'text-blue-400' },
              { label: 'Serviços', value: services.filter(s => s.is_active).length, color: 'text-purple-400' },
            ].map(({ label, value, color }) => (
              <Card key={label} className="bg-card/40 border-border/30 rounded-xl p-3 text-center gap-0 py-3 shadow-none">
                <p className={clsx('text-xl font-bold', color)}>{value}</p>
                <p className="text-muted-foreground/50 text-xs mt-0.5">{label}</p>
              </Card>
            ))}
          </div>
        </div>
      </header>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="gap-0">
        <div className="border-b border-border/30 bg-background/20 sticky top-0 z-10 backdrop-blur-xl">
          <div className="w-full mx-auto px-5 md:px-8">
            <TabsList className="bg-transparent border-b border-border/30 rounded-none h-auto p-0 w-full">
              {([
                { key: 'agenda', label: 'Agenda', icon: LayoutGrid },
                { key: 'customers', label: 'Clientes', icon: Users },
                { key: 'services', label: 'Serviços', icon: Scissors },
                { key: 'schedule', label: 'Horários', icon: Clock },
                { key: 'team', label: 'Equipa', icon: Users },
                { key: 'reports', label: 'Relatórios', icon: BarChart3 },
                { key: 'settings', label: 'Definições', icon: Settings2 },
              ] as { key: Tab; label: string; icon: any }[]).map(({ key, label, icon: Icon }) => (
                <TabsTrigger key={key} value={key}
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-muted-foreground/50 hover:text-muted-foreground py-3.5 px-4 gap-1.5 text-sm font-medium">
                  <Icon size={14} />{label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </div>

        <main className="w-full mx-auto px-5 py-6 md:px-8">

          {/* ── AGENDA ── */}
          <TabsContent value="agenda">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <Button onClick={() => setCurrentPage(p => Math.max(0, p - 1))} disabled={currentPage === 0} variant="outline" className="rounded-xl h-auto py-2">
                  <ChevronLeft size={16} className="mr-1" /> Anterior
                </Button>
                <div className="text-center flex-1 mx-4">
                  <h2 className="text-muted-foreground text-xs font-semibold uppercase tracking-widest flex items-center justify-center gap-2">
                    {format(new Date(), "MMMM", { locale: pt })}
                    <Button onClick={fetchBookings} variant="ghost" size="icon" className="w-6 h-6 rounded-lg ml-2">
                      <RefreshCw size={12} className={clsx('text-muted-foreground', loading && 'animate-spin')} />
                    </Button>
                  </h2>
                  <p className="text-foreground font-bold text-sm mb-2">Página {currentPage + 1} de {maxPage + 1}</p>
                  
                  <Button 
                    onClick={() => setIsManualBookingOpen(true)}
                    className="w-full max-w-[200px] h-9 text-xs rounded-xl font-bold mx-auto gap-1 shadow-sm"
                  >
                    <Plus size={14} /> Nova Marcação
                  </Button>
                </div>
                <Button onClick={() => setCurrentPage(p => Math.min(maxPage, p + 1))} disabled={currentPage >= maxPage} variant="outline" className="rounded-xl h-auto py-2">
                  Próximos <ChevronRight size={16} className="ml-1" />
                </Button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground/50">
                  <Loader2 size={18} className="animate-spin" />
                  <span className="text-sm">A carregar...</span>
                </div>
              ) : (
                <div className={clsx("grid gap-4", daysPerPage === 4 ? "grid-cols-4" : daysPerPage === 3 ? "grid-cols-3" : daysPerPage === 2 ? "grid-cols-2" : "grid-cols-1")}>
                  {visibleDays.map(dateKey => {
                    const dailyBookings = groupedBookings[dateKey] || []
                    const dummyDate = new Date(`${dateKey}T12:00:00`)
                    const headerLabel = formatDateLabel(dummyDate.toISOString())
                    
                    return (
                      <div key={dateKey} className="space-y-3 bg-card/10 rounded-3xl p-4 border border-border/10 min-h-[300px]">
                        <h2 className="text-foreground text-sm font-bold uppercase tracking-wide border-b border-border/20 pb-3 flex justify-between items-center">
                          {headerLabel}
                          <Badge variant="outline" className="text-[10px] bg-background/50 border-border/20">{dailyBookings.length}</Badge>
                        </h2>
                        <div className="space-y-2">
                          {dailyBookings.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground/30">
                              <Calendar size={24} className="mb-2" />
                              <p className="text-xs font-medium">Livre</p>
                            </div>
                          ) : (
                            dailyBookings.map(b => (
                              <BookingCard key={b.id} booking={b} formatTime={formatTime}
                                onCancel={handleCancel} onNoShow={handleNoShow} cancelling={cancelling === b.id} />
                            ))
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </TabsContent>

              {/* ── CLIENTES ── */}
          <TabsContent value="customers">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-muted-foreground text-xs font-semibold uppercase tracking-widest">Histórico de Clientes</h2>
                {customers.length > 0 && (
                  <Button variant="outline" size="sm" onClick={handleExportCSV}
                    className="h-8 text-xs rounded-xl bg-card/40 border-border/40 gap-1.5">
                    ↓ Exportar CSV
                  </Button>
                )}
              </div>
              
              {loadingCustomers ? (
                <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground/50">
                  <Loader2 size={18} className="animate-spin" />
                  <span className="text-sm">A carregar clientes...</span>
                </div>
              ) : customers.length === 0 ? (
                <Card className="bg-card/30 border-border/30 rounded-2xl p-10 text-center gap-0 py-10 shadow-none">
                  <Users size={28} className="text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground/50 text-sm">Ainda não tem clientes registados</p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {customers.map(c => (
                    <Card key={c.id} className="bg-card/40 border-border/30 rounded-2xl p-5 shadow-none flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="font-bold text-foreground text-lg truncate pr-2">{c.name}</h3>
                          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 shrink-0">
                            {c.total_visits} {c.total_visits === 1 ? 'visita' : 'visitas'}
                          </Badge>
                        </div>
                        
                        <div className="space-y-1.5 mb-4">
                          <p className="text-sm text-muted-foreground flex items-center gap-2">
                            <Phone size={14} className="text-muted-foreground/60" /> {c.phone}
                          </p>
                          <p className="text-sm text-muted-foreground flex items-center gap-2">
                            <Calendar size={14} className="text-muted-foreground/60" /> 
                            Última: {c.last_visit ? format(new Date(c.last_visit), "d MMM yyyy", { locale: pt }) : 'N/A'}
                          </p>
                          <p className="text-sm text-muted-foreground flex items-center gap-2">
                            <Scissors size={14} className="text-muted-foreground/60" /> 
                            {c.last_service || 'N/A'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 pt-3 border-t border-border/10">
                        <Button variant="outline" className="flex-1 bg-card/50 border-border/40 text-xs h-9 hover:bg-blue-500/10 hover:text-blue-400 hover:border-blue-500/20 transition-all" onClick={() => { const digits = c.phone.replace(/\D/g, ''); const num = digits.startsWith('351') ? `+${digits}` : `+351${digits}`; window.open(`sms:${num}`, '_blank') }}>
                          SMS
                        </Button>
                        <Button variant="outline" className="flex-1 bg-card/50 border-border/40 text-xs h-9 transition-all hover:bg-primary/10 hover:text-primary hover:border-primary/20" onClick={() => window.location.href = `tel:${c.phone}`}>
                          Ligar
                        </Button>
                        <Button variant="ghost" size="icon" className="w-9 h-9 shrink-0 text-muted-foreground/30 hover:text-destructive hover:bg-destructive/10 rounded-xl" onClick={() => handleDeleteCustomer(c.id, c.name)} title="Apagar dados (RGPD)">
                          <Trash2 size={13} />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── SERVIÇOS ── */}
          <TabsContent value="services">
            <div className="space-y-4">
              <h2 className="text-muted-foreground text-xs font-semibold uppercase tracking-widest">Serviços activos</h2>

              {services.length === 0 && (
                <Card className="bg-primary/5 border-primary/20 border-dashed rounded-2xl p-6 text-center shadow-none">
                  <Scissors size={24} className="text-primary/40 mx-auto mb-2" />
                  <p className="font-semibold text-foreground text-sm mb-1">Adiciona o teu primeiro serviço</p>
                  <p className="text-xs text-muted-foreground/60">Ex: "Corte de Cabelo · 30 min · 10€"</p>
                </Card>
              )}

              {services.map(svc => (
                <Card key={svc.id} className={clsx('border-border/30 rounded-2xl p-4 shadow-none transition-colors',
                  svc.is_active ? 'bg-card/40' : 'bg-card/20 opacity-60')}>
                  {editingServiceId === svc.id ? (
                    <div className="space-y-3">
                      <Input value={editSvcName} onChange={e => setEditSvcName(e.target.value)}
                        placeholder="Nome do serviço"
                        className="bg-card/60 border-border/40 rounded-xl text-foreground focus-visible:ring-primary/30 h-10 text-sm" />
                      <div className="flex gap-2">
                        <select value={editSvcDuration} onChange={e => setEditSvcDuration(e.target.value)}
                          className="flex-1 bg-card/60 border border-border/40 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none">
                          {[15,20,30,45,60,90,120].map(m => <option key={m} value={m} className="bg-background">{m} min</option>)}
                        </select>
                        <Input value={editSvcPrice} onChange={e => setEditSvcPrice(e.target.value)}
                          type="number" placeholder="Preço €" step="0.50" min="0"
                          className="flex-1 bg-card/60 border-border/40 rounded-xl text-foreground focus-visible:ring-primary/30 h-10 text-sm" />
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => handleSaveEditService(svc)} disabled={savingEditSvc || !editSvcName.trim()}
                          className="flex-1 rounded-xl h-9 text-xs font-bold">
                          {savingEditSvc ? 'A guardar...' : 'Guardar'}
                        </Button>
                        <Button variant="outline" onClick={() => setEditingServiceId(null)}
                          className="flex-1 rounded-xl h-9 text-xs bg-card/40 border-border/40">
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                          <Scissors size={15} className="text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground text-sm">{svc.name}</p>
                          <p className="text-muted-foreground text-xs mt-0.5">
                            {svc.duration_minutes} min{svc.price != null ? ` · ${svc.price.toFixed(2)}€` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={svc.is_active} onCheckedChange={() => handleToggleService(svc)} />
                        <Button variant="ghost" size="icon" onClick={() => startEditService(svc)}
                          className="w-8 h-8 rounded-lg text-muted-foreground/40 hover:text-primary hover:bg-primary/10">
                          <Pencil size={13} />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteService(svc)}
                          className="w-8 h-8 rounded-lg text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10">
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              ))}

              {/* Add form */}
              <Card className="bg-card/30 border-dashed border-border/40 rounded-2xl p-5 mt-6 gap-0 py-5 shadow-none">
                <p className="text-muted-foreground text-sm font-medium mb-4 flex items-center gap-2">
                  <Plus size={14} className="text-primary" />Adicionar serviço
                </p>
                <form onSubmit={handleAddService} className="space-y-3">
                  <Input type="text" placeholder="Nome do serviço *" value={newName}
                    onChange={e => setNewName(e.target.value)}
                    className="bg-card/60 border-border/40 rounded-xl text-foreground placeholder:text-muted-foreground/50 focus-visible:ring-primary/30 px-4 py-3 h-auto text-sm" />
                  <div className="flex gap-3">
                    <select value={newDuration} onChange={e => setNewDuration(e.target.value)}
                      className="flex-1 bg-card/60 border border-border/40 rounded-xl px-4 py-3
                        text-sm text-foreground focus:outline-none focus:border-primary/50">
                      {[15,20,30,45,60,90,120].map(m => <option key={m} value={m} className="bg-background">{m} min</option>)}
                    </select>
                    <Input type="number" placeholder="Preço €" value={newPrice} onChange={e => setNewPrice(e.target.value)}
                      step="0.50" min="0"
                      className="flex-1 bg-card/60 border-border/40 rounded-xl text-foreground placeholder:text-muted-foreground/50 focus-visible:ring-primary/30 px-4 py-3 h-auto text-sm" />
                  </div>
                  <Button type="submit" disabled={savingSvc || !newName.trim()}
                    className="w-full rounded-2xl font-bold py-3 h-auto">
                    {savingSvc ? 'A guardar...' : 'Guardar serviço'}
                  </Button>
                </form>
              </Card>
            </div>
          </TabsContent>

          {/* ── HORÁRIOS ── */}
          <TabsContent value="schedule">
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-muted-foreground text-xs font-semibold uppercase tracking-widest">Horário semanal</h2>
                <select 
                  value={scheduleStaffId || ''} 
                  onChange={(e) => setScheduleStaffId(e.target.value || null)}
                  className="bg-card border border-border/30 rounded-lg text-xs px-2 py-1.5 focus:outline-none"
                >
                  <option value="">Geral da Barbearia</option>
                  {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              {[1,2,3,4,5,6,0].map(dow => {
                const rule = availability.find((a: any) => a.day_of_week === dow && a.staff_id === scheduleStaffId)
                const active = rule?.is_active ?? false
                return (
                  <Card key={dow} className={clsx('bg-card/40 rounded-2xl p-4 transition-all gap-0 py-4 shadow-none',
                    active ? 'border-border/30' : 'border-border/20 opacity-50'
                  )}>
                    <div className="flex items-center gap-4">
                      <Switch
                        checked={active}
                        onCheckedChange={(checked) => updateDay(dow, 'is_active', checked)}
                      />
                      <span className="text-foreground font-semibold text-sm w-8">{DAY_NAMES[dow]}</span>
                      {active && (
                        <div className="flex items-center gap-2 ml-auto">
                          {(['start_hour','end_hour'] as const).map((field, i) => (
                            <Input key={field} type="time"
                              value={rule?.[field] ?? (i === 0 ? '09:00' : '19:00')}
                              onChange={e => updateDay(dow, field, e.target.value)}
                              className="bg-card/60 border-border/40 rounded-lg px-2 py-1.5 h-auto
                                text-sm text-foreground focus-visible:ring-primary/30 font-mono w-auto" />
                          ))}
                        </div>
                      )}
                      {!active && <span className="ml-auto text-muted-foreground/40 text-xs">Fechado</span>}
                    </div>
                  </Card>
                )
              })}

              {savedSchedule ? (
                <Button variant="outline" disabled
                  className="w-full rounded-2xl bg-green-500/15 text-green-400 border-green-500/20 py-3.5 h-auto text-sm font-bold mt-2">
                  ✓ Guardado
                </Button>
              ) : (
                <Button onClick={handleSaveSchedule} disabled={savingSchedule}
                  className="w-full rounded-2xl font-bold py-3.5 h-auto text-sm mt-2">
                  {savingSchedule ? 'A guardar...' : 'Guardar horários'}
                </Button>
              )}

              <div className="pt-8 space-y-4">
                <h2 className="text-muted-foreground text-xs font-semibold uppercase tracking-widest border-t border-border/20 pt-8">
                  Dias Fechados / Bloqueios
                </h2>

                {/* Form to add closed period */}
                <Card className="bg-card/30 border-dashed border-border/40 rounded-2xl p-5 gap-0 py-5 shadow-none">
                  <p className="text-muted-foreground text-sm font-medium mb-4 flex items-center gap-2">
                    <Plus size={14} className="text-primary" />Adicionar bloqueio
                  </p>
                  <form onSubmit={handleAddClosedPeriod} className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">Data (Dia inteiro ou parcial)</label>
                      <Input type="date" value={newClosedDate} onChange={e => setNewClosedDate(e.target.value)} required
                        className="bg-card/60 border-border/40 rounded-xl text-foreground focus-visible:ring-primary/30" />
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-1 space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground">Hora Início (Opcional)</label>
                        <Input type="time" value={newClosedStart} onChange={e => setNewClosedStart(e.target.value)}
                          className="bg-card/60 border-border/40 rounded-xl text-foreground focus-visible:ring-primary/30" />
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground">Hora Fim (Opcional)</label>
                        <Input type="time" value={newClosedEnd} onChange={e => setNewClosedEnd(e.target.value)}
                          className="bg-card/60 border-border/40 rounded-xl text-foreground focus-visible:ring-primary/30" />
                      </div>
                    </div>
                    <Button type="submit" disabled={savingClosed || !newClosedDate}
                      className="w-full rounded-xl font-bold mt-2">
                      {savingClosed ? 'A guardar...' : 'Bloquear Data'}
                    </Button>
                  </form>
                </Card>

                {/* List of closed periods */}
                <div className="space-y-2 mt-4">
                  {loadingClosed ? (
                    <div className="text-center py-4 text-muted-foreground/50"><Loader2 className="w-4 h-4 animate-spin mx-auto" /></div>
                  ) : closedPeriods.filter(c => c.staff_id === scheduleStaffId).length === 0 ? (
                    <p className="text-xs text-muted-foreground/50 text-center py-4">Nenhum dia bloqueado.</p>
                  ) : (
                    closedPeriods.filter(c => c.staff_id === scheduleStaffId).map(cp => (
                      <Card key={cp.id} className="bg-card/40 border-border/30 rounded-xl p-4 flex items-center justify-between shadow-none">
                        <div>
                          <p className="font-semibold text-foreground text-sm flex items-center gap-2">
                            <Calendar size={14} className="text-destructive" />
                            {format(new Date(cp.date), "d MMM yyyy", { locale: pt })}
                          </p>
                          <p className="text-muted-foreground text-xs mt-0.5">
                            {!cp.start_time ? 'Dia Inteiro Fechado' : `Bloqueado das ${cp.start_time.slice(0,5)} às ${cp.end_time?.slice(0,5)}`}
                          </p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteClosedPeriod(cp.id)}
                          className="text-destructive/60 hover:text-destructive hover:bg-destructive/10 h-8 w-8 rounded-lg">
                          <XCircle size={16} />
                        </Button>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            </div>
          </TabsContent>
          {/* ── RELATÓRIOS ── */}
          <TabsContent value="reports">
            <ReportsTab businessId={business.id} />
          </TabsContent>

          {/* ── DEFINIÇÕES ── */}
          <TabsContent value="settings">
            <div className="space-y-4 max-w-lg">
              <h2 className="text-muted-foreground text-xs font-semibold uppercase tracking-widest">Definições da Barbearia</h2>

              <Card className="bg-card/40 border-border/30 rounded-2xl p-5 shadow-none">
                <form onSubmit={handleSaveSettings} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nome</label>
                    <Input
                      value={settingsName}
                      onChange={e => setSettingsName(e.target.value)}
                      required
                      className="bg-card/60 border-border/40 rounded-xl text-foreground focus-visible:ring-primary/30 h-11"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Telefone</label>
                    <Input
                      value={settingsPhone}
                      onChange={e => setSettingsPhone(e.target.value)}
                      placeholder="+351 912 345 678"
                      className="bg-card/60 border-border/40 rounded-xl text-foreground focus-visible:ring-primary/30 h-11"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Morada</label>
                    <Input
                      value={settingsAddress}
                      onChange={e => setSettingsAddress(e.target.value)}
                      placeholder="Rua das Flores 123, Lisboa"
                      className="bg-card/60 border-border/40 rounded-xl text-foreground focus-visible:ring-primary/30 h-11"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Descrição</label>
                    <textarea
                      value={settingsDescription}
                      onChange={e => setSettingsDescription(e.target.value)}
                      placeholder="A melhor barbearia da cidade..."
                      rows={3}
                      className="w-full bg-card/60 border border-border/40 rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary/50 resize-none placeholder:text-muted-foreground/40"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Logo</label>
                    <div className="flex items-center gap-3">
                      {settingsLogoUrl ? (
                        <img src={settingsLogoUrl} alt="Logo" className="w-12 h-12 rounded-xl object-cover bg-card border border-border/40 shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-primary/10 border border-border/40 flex items-center justify-center shrink-0">
                          <Scissors size={18} className="text-primary" />
                        </div>
                      )}
                      <label className={clsx(
                        'flex items-center gap-2 px-4 h-11 rounded-xl border border-border/40 bg-card/60 text-sm font-medium cursor-pointer transition-colors hover:bg-card',
                        uploadingLogo ? 'text-muted-foreground pointer-events-none' : 'text-foreground'
                      )}>
                        {uploadingLogo ? <Loader2 size={15} className="animate-spin" /> : <ImagePlus size={15} />}
                        {uploadingLogo ? 'A enviar...' : 'Importar imagem'}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={uploadingLogo}
                          onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f, 'logo'); e.target.value = '' }}
                        />
                      </label>
                      {settingsLogoUrl && (
                        <button type="button" onClick={() => setSettingsLogoUrl('')}
                          className="text-xs text-muted-foreground/60 hover:text-destructive transition-colors">
                          Remover
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground/40">Substitui o ícone de tesoura na página de marcações. PNG/JPG até 5 MB.</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Imagem de Capa</label>
                    <div className="flex items-center gap-3">
                      {settingsCoverUrl ? (
                        <img src={settingsCoverUrl} alt="Capa" className="w-20 h-12 rounded-xl object-cover bg-card border border-border/40 shrink-0" />
                      ) : (
                        <div className="w-20 h-12 rounded-xl bg-primary/10 border border-border/40 flex items-center justify-center shrink-0">
                          <ImagePlus size={16} className="text-primary/60" />
                        </div>
                      )}
                      <label className={clsx(
                        'flex items-center gap-2 px-4 h-11 rounded-xl border border-border/40 bg-card/60 text-sm font-medium cursor-pointer transition-colors hover:bg-card',
                        uploadingCover ? 'text-muted-foreground pointer-events-none' : 'text-foreground'
                      )}>
                        {uploadingCover ? <Loader2 size={15} className="animate-spin" /> : <ImagePlus size={15} />}
                        {uploadingCover ? 'A enviar...' : 'Importar imagem'}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={uploadingCover}
                          onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f, 'cover'); e.target.value = '' }}
                        />
                      </label>
                      {settingsCoverUrl && (
                        <button type="button" onClick={() => setSettingsCoverUrl('')}
                          className="text-xs text-muted-foreground/60 hover:text-destructive transition-colors">
                          Remover
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground/40">Foto para o cabeçalho da página de marcações. PNG/JPG até 5 MB.</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cor de Destaque</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={/^#[0-9a-fA-F]{6}$/.test(settingsBrandColor) ? settingsBrandColor : '#f59e0b'}
                        onChange={e => setSettingsBrandColor(e.target.value)}
                        className="w-11 h-11 rounded-xl border border-border/40 bg-card/60 cursor-pointer p-1"
                      />
                      <Input
                        value={settingsBrandColor}
                        onChange={e => setSettingsBrandColor(e.target.value)}
                        placeholder="#f59e0b"
                        className="bg-card/60 border-border/40 rounded-xl text-foreground focus-visible:ring-primary/30 h-11 max-w-[140px]"
                      />
                      {settingsBrandColor && (
                        <button type="button" onClick={() => setSettingsBrandColor('')}
                          className="text-xs text-muted-foreground/60 hover:text-destructive transition-colors">
                          Repor cor padrão
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground/40">Substitui o laranja nos botões e detalhes da página de marcações.</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fuso Horário</label>
                    <select
                      value={settingsTimezone}
                      onChange={e => setSettingsTimezone(e.target.value)}
                      className="w-full bg-card/60 border border-border/40 rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/50 h-11"
                    >
                      <option value="Europe/Lisbon">Europa/Lisboa (GMT+0/+1)</option>
                      <option value="Atlantic/Azores">Açores (GMT-1/0)</option>
                      <option value="Atlantic/Madeira">Madeira (GMT+0/+1)</option>
                      <option value="Europe/London">Londres (GMT+0/+1)</option>
                      <option value="Europe/Paris">Paris (GMT+1/+2)</option>
                    </select>
                  </div>

                  <div className="pt-1 space-y-2">
                    <div className="bg-card/30 border border-border/20 rounded-xl p-4">
                      <p className="text-xs text-muted-foreground/50 mb-1">Link de marcações</p>
                      <p className="text-sm text-primary/80 font-mono truncate">
                        {typeof window !== 'undefined' ? window.location.origin : ''}/{business.slug}
                      </p>
                    </div>
                    <div className="bg-card/30 border border-border/20 rounded-xl p-4 space-y-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">Pré-pagamento (anti-faltas)</p>
                        <p className="text-xs text-muted-foreground/50 mt-0.5">
                          Exige pagamento por MB WAY/cartão no momento da marcação. A marcação só fica confirmada depois de pago.
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { v: 'off',             label: 'Desligado' },
                          { v: 'full',            label: '100% do serviço' },
                          { v: 'deposit_fixed',   label: 'Sinal fixo (€)' },
                          { v: 'deposit_percent', label: 'Sinal (%)' },
                        ].map(o => (
                          <button
                            type="button"
                            key={o.v}
                            onClick={() => setPrepayMode(o.v)}
                            className={clsx(
                              'h-9 rounded-xl text-xs font-semibold border transition-colors',
                              prepayMode === o.v
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-card/40 border-border/40 text-muted-foreground hover:text-foreground'
                            )}
                          >
                            {o.label}
                          </button>
                        ))}
                      </div>
                      {(prepayMode === 'deposit_fixed' || prepayMode === 'deposit_percent') && (
                        <div className="relative">
                          <Input
                            type="number"
                            min="0"
                            step={prepayMode === 'deposit_percent' ? '1' : '0.50'}
                            value={prepayValue}
                            onChange={e => setPrepayValue(e.target.value)}
                            placeholder={prepayMode === 'deposit_percent' ? 'Ex: 30' : 'Ex: 5.00'}
                            className="bg-card border-border/50 rounded-xl pr-9 h-10 text-sm"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground/60">
                            {prepayMode === 'deposit_percent' ? '%' : '€'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {savedSettings ? (
                    <Button disabled variant="outline"
                      className="w-full rounded-xl bg-green-500/15 text-green-400 border-green-500/20 h-11 font-bold">
                      ✓ Guardado
                    </Button>
                  ) : (
                    <Button type="submit" disabled={savingSettings || !settingsName.trim()}
                      className="w-full rounded-xl font-bold h-11">
                      {savingSettings ? 'A guardar...' : 'Guardar Definições'}
                    </Button>
                  )}
                </form>
              </Card>
            </div>
          </TabsContent>

          {/* ── EQUIPA ── */}
          <TabsContent value="team">
            <div className="space-y-4">
              <h2 className="text-muted-foreground text-xs font-semibold uppercase tracking-widest">Equipa (Barbeiros)</h2>

              {staff.length === 0 ? (
                 <p className="text-xs text-muted-foreground/50 py-4">Ainda não tens equipa. Adiciona os teus barbeiros para que os clientes os possam escolher!</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {staff.map(s => (
                    <Card key={s.id} className={clsx('border-border/30 rounded-2xl p-4 flex items-center justify-between shadow-none transition-colors',
                      s.is_active ? 'bg-card/40' : 'bg-card/20 opacity-60')}>
                      <div className="flex items-center gap-3">
                        <div className={clsx('w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm',
                          s.is_active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground')}>
                          {s.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground text-sm">{s.name}</p>
                          <p className="text-xs text-muted-foreground/50">{s.is_active ? 'Ativo' : 'Inativo'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={s.is_active} onCheckedChange={() => handleToggleStaff(s)} />
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteStaff(s)}
                          className="w-8 h-8 rounded-lg text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10">
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              <Card className="bg-card/30 border-dashed border-border/40 rounded-2xl p-5 mt-6 shadow-none">
                <p className="text-muted-foreground text-sm font-medium mb-4 flex items-center gap-2">
                  <Plus size={14} className="text-primary" />Adicionar Barbeiro
                </p>
                <form onSubmit={handleAddStaff} className="flex gap-3">
                  <Input type="text" placeholder="Nome do barbeiro (ex: João Silva)" value={newStaffName}
                    onChange={e => setNewStaffName(e.target.value)} required
                    className="flex-1 bg-card/60 border-border/40 rounded-xl text-foreground focus-visible:ring-primary/30 px-4" />
                  <Button type="submit" disabled={savingStaff || !newStaffName.trim()}
                    className="rounded-xl font-bold px-6">
                    {savingStaff ? '...' : 'Adicionar'}
                  </Button>
                </form>
              </Card>
            </div>
          </TabsContent>
        </main>
      </Tabs>

      <ManualBookingDialog
        isOpen={isManualBookingOpen}
        onClose={() => setIsManualBookingOpen(false)}
        businessId={business.id}
        timezone={business.timezone}
        services={services}
        staff={staff}
        onSuccess={() => {
          fetchBookings()
        }}
      />
    </div>
  )
}

function BookingCard({ booking, formatTime, formatDateLabel, onCancel, onNoShow, cancelling, showDate = false }:
  { booking: BookingWithDetails; formatTime: (s:string)=>string; formatDateLabel?: (s:string)=>string; onCancel:(id:string)=>void; onNoShow:(id:string)=>void; cancelling:boolean; showDate?: boolean }) {

  const isPast = new Date(booking.start_time) < new Date()

  const statusConfig = {
    confirmed: { label: 'Confirmado', badgeCls: 'bg-green-500/10 text-green-400 border-green-500/20 text-[10px]' },
    cancelled:  { label: 'Cancelado',  badgeCls: 'bg-destructive/10 text-destructive border-destructive/20 text-[10px]' },
    completed:  { label: 'Concluído',  badgeCls: 'bg-muted text-muted-foreground border-border text-[10px]' },
    no_show:    { label: 'Falta',      badgeCls: 'bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px]' },
  }[booking.status as string] ?? { label: booking.status, badgeCls: 'bg-muted text-muted-foreground border-border text-[10px]' }

  return (
    <Card className="bg-card/40 border-border/30 rounded-2xl p-4 gap-0 py-4 shadow-none">
      <div className="flex items-start gap-4">
        <div className="bg-card/60 border border-border/30 rounded-xl px-3 py-2.5 text-center flex-shrink-0">
          {showDate && formatDateLabel && (
            <p className="text-[9px] text-primary/70 font-bold uppercase">{formatDateLabel(booking.start_time)}</p>
          )}
          <p className="text-base font-bold text-foreground font-mono leading-tight">{formatTime(booking.start_time)}</p>
        </div>
        <div className="flex-1 min-w-0 pt-0.5">
          <p className="font-semibold text-foreground text-sm break-words leading-tight">{booking.customers?.name || 'Cliente'}</p>
          <div className="text-muted-foreground text-xs mt-1 flex items-center flex-wrap gap-2">
            <span className="flex items-center gap-1.5"><Scissors size={10} className="text-primary/60" />{booking.services?.name || 'Serviço'}</span>
            {booking.staff && <span className="flex items-center gap-1 opacity-80"><Users size={10} />{booking.staff.name}</span>}
          </div>
          {booking.customers?.phone && (
            <p className="text-muted-foreground/50 text-[10px] mt-1 flex items-center gap-1.5">
              <Phone size={10} />{booking.customers.phone}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge variant="outline" className={clsx('font-semibold px-2 py-1 rounded-full', statusConfig.badgeCls)}>
            {statusConfig.label}
          </Badge>
          {booking.status === 'confirmed' && !isPast && (
            <Button variant="ghost" onClick={() => onCancel(booking.id)} disabled={cancelling}
              className="text-[11px] text-destructive/60 hover:text-destructive h-auto p-0 hover:bg-transparent disabled:opacity-30">
              {cancelling ? '...' : 'Cancelar'}
            </Button>
          )}
          {booking.status === 'confirmed' && isPast && (
            <Button variant="ghost" onClick={() => onNoShow(booking.id)}
              className="text-[11px] text-amber-500/60 hover:text-amber-400 h-auto p-0 hover:bg-transparent">
              Falta
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}