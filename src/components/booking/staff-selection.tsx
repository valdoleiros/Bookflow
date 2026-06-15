"use client"

import { Card } from "@/components/ui/card"
import { Users, CheckCircle2 } from "lucide-react"

interface Staff { id: string; name: string; is_active: boolean }

export function StaffSelection({
  staff,
  selectedStaffId,
  onSelect
}: {
  staff: Staff[]
  selectedStaffId: string | null
  onSelect: (id: string | null) => void
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Com quem quer cortar?</h2>
        <p className="text-muted-foreground text-sm">Escolha o seu barbeiro preferido</p>
      </div>

      <div className="space-y-3">
        {/* Opção: Qualquer Um */}
        <Card
          onClick={() => onSelect(null)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(null) } }}
          className={`cursor-pointer transition-all duration-300 p-4 border-2 shadow-sm ${
            selectedStaffId === null
              ? "border-primary bg-primary/5"
              : "border-border/40 hover:border-primary/40 bg-card hover:bg-card/80"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                <Users className="w-6 h-6 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-base">Qualquer um</h3>
                <p className="text-muted-foreground text-xs">O primeiro horário livre</p>
              </div>
            </div>
            {selectedStaffId === null && <CheckCircle2 className="w-6 h-6 text-primary" />}
          </div>
        </Card>

        {/* Lista de Barbeiros */}
        {staff.map(s => (
          <Card
            key={s.id}
            onClick={() => onSelect(s.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(s.id) } }}
            className={`cursor-pointer transition-all duration-300 p-4 border-2 shadow-sm ${
              selectedStaffId === s.id
                ? "border-primary bg-primary/5"
                : "border-border/40 hover:border-primary/40 bg-card hover:bg-card/80"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center font-bold text-primary text-xl">
                  {s.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-base">{s.name}</h3>
                  <p className="text-muted-foreground text-xs">Barbeiro</p>
                </div>
              </div>
              {selectedStaffId === s.id && <CheckCircle2 className="w-6 h-6 text-primary" />}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
