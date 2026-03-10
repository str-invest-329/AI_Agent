"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { deals, stageColors, stageLabels, formatCurrency, type Deal } from "@/lib/data"

const kanbanStages = ["lead", "qualified", "proposal", "negotiation", "closed-won"] as const

function DealCard({ deal }: { deal: Deal }) {
  return (
    <Card className="mb-3 cursor-pointer transition-shadow hover:shadow-md">
      <CardContent className="p-3">
        <p className="text-sm font-medium">{deal.title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{deal.company}</p>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-sm font-semibold">{formatCurrency(deal.value)}</span>
          <Badge variant="outline" className="text-xs">
            {deal.probability}%
          </Badge>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Close: {new Date(deal.expectedClose).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </p>
      </CardContent>
    </Card>
  )
}

export function KanbanBoard() {
  const dealsByStage = kanbanStages.map((stage) => ({
    stage,
    label: stageLabels[stage],
    color: stageColors[stage],
    deals: deals.filter((d) => d.stage === stage),
    total: deals.filter((d) => d.stage === stage).reduce((sum, d) => sum + d.value, 0),
  }))

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {dealsByStage.map((column) => (
        <div key={column.stage} className="flex w-72 shrink-0 flex-col">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge className={column.color} variant="secondary">
                {column.label}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {column.deals.length}
              </span>
            </div>
            <span className="text-xs font-medium text-muted-foreground">
              {formatCurrency(column.total)}
            </span>
          </div>
          <ScrollArea className="flex-1">
            <div className="space-y-0">
              {column.deals.map((deal) => (
                <DealCard key={deal.id} deal={deal} />
              ))}
              {column.deals.length === 0 && (
                <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                  No deals
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      ))}
    </div>
  )
}
