"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { KanbanBoard } from "@/components/crm/kanban-board"
import { deals, stageLabels, stageColors, formatCurrency } from "@/lib/data"

export default function DealsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Deals</h1>
        <p className="text-muted-foreground">Manage your sales pipeline</p>
      </div>

      <Tabs defaultValue="kanban">
        <TabsList>
          <TabsTrigger value="kanban">Kanban</TabsTrigger>
          <TabsTrigger value="table">Table</TabsTrigger>
        </TabsList>

        <TabsContent value="kanban" className="mt-4">
          <KanbanBoard />
        </TabsContent>

        <TabsContent value="table" className="mt-4">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Deal</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Probability</TableHead>
                  <TableHead>Expected Close</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deals.map((deal) => (
                  <TableRow key={deal.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{deal.title}</p>
                        <p className="text-xs text-muted-foreground">{deal.contact}</p>
                      </div>
                    </TableCell>
                    <TableCell>{deal.company}</TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(deal.value)}
                    </TableCell>
                    <TableCell>
                      <Badge className={stageColors[deal.stage]} variant="secondary">
                        {stageLabels[deal.stage]}
                      </Badge>
                    </TableCell>
                    <TableCell>{deal.probability}%</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(deal.expectedClose).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
