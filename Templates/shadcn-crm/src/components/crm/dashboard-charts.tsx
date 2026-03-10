"use client"

import { Bar, BarChart, Line, LineChart, XAxis, YAxis, CartesianGrid } from "recharts"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

const revenueData = [
  { month: "Oct", revenue: 186000, deals: 4 },
  { month: "Nov", revenue: 215000, deals: 5 },
  { month: "Dec", revenue: 178000, deals: 3 },
  { month: "Jan", revenue: 245000, deals: 6 },
  { month: "Feb", revenue: 290000, deals: 7 },
  { month: "Mar", revenue: 320000, deals: 8 },
]

const revenueConfig = {
  revenue: { label: "Revenue", color: "var(--chart-1)" },
  deals: { label: "Deals", color: "var(--chart-2)" },
} satisfies ChartConfig

const pipelineData = [
  { stage: "Lead", value: 345000 },
  { stage: "Qualified", value: 245000 },
  { stage: "Proposal", value: 152000 },
  { stage: "Negotiation", value: 255000 },
]

const pipelineConfig = {
  value: { label: "Value", color: "var(--chart-3)" },
} satisfies ChartConfig

export function RevenueChart() {
  return (
    <ChartContainer config={revenueConfig} className="min-h-[250px] w-full">
      <LineChart data={revenueData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="month" className="text-xs" tickLine={false} axisLine={false} />
        <YAxis className="text-xs" tickLine={false} axisLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Line type="monotone" dataKey="revenue" stroke="var(--color-revenue)" strokeWidth={2} dot={false} />
      </LineChart>
    </ChartContainer>
  )
}

export function PipelineChart() {
  return (
    <ChartContainer config={pipelineConfig} className="min-h-[250px] w-full">
      <BarChart data={pipelineData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="stage" className="text-xs" tickLine={false} axisLine={false} />
        <YAxis className="text-xs" tickLine={false} axisLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="value" fill="var(--color-value)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  )
}
