"use client"

import { Scissors } from "lucide-react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface Service {
  id: string
  name: string
  duration_minutes: number
  price: number | null
}

interface ServiceSelectionProps {
  services: Service[]
  selectedService: Service | null
  onSelect: (service: Service) => void
}

export function ServiceSelection({ services, selectedService, onSelect }: ServiceSelectionProps) {
  return (
    <div className="space-y-4">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-semibold text-foreground">Escolha o Serviço</h2>
        <p className="text-muted-foreground mt-1">Selecione o serviço desejado</p>
      </div>

      <div className="space-y-3">
        {services.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Scissors className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhum serviço disponível de momento.</p>
          </div>
        ) : services.map((service) => {
          const isSelected = selectedService?.id === service.id
          return (
            <Card
              key={service.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(service)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(service) }}
              className={cn(
                "w-full p-5 rounded-2xl transition-all duration-200 flex flex-row items-center justify-between cursor-pointer border py-5 shadow-none gap-0",
                isSelected
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-foreground hover:bg-secondary border-border/50"
              )}
            >
              <div className="flex items-center gap-4">
                <div className={cn(
                  "p-3 rounded-xl",
                  isSelected ? "bg-primary-foreground/20" : "bg-secondary"
                )}>
                  <Scissors className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-lg">{service.name}</p>
                  <p className={cn(
                    "text-sm",
                    isSelected ? "text-primary-foreground/70" : "text-muted-foreground"
                  )}>
                    {service.duration_minutes}min
                  </p>
                </div>
              </div>
              {service.price != null && (
                <span className="text-xl font-semibold">
                  {service.price % 1 === 0 ? `${service.price}€` : `${service.price.toFixed(2)}€`}
                </span>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}