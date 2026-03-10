"use client"

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DollarSign, Users, Handshake, TrendingUp } from "lucide-react"
import { RevenueChart, PipelineChart } from "@/components/crm/dashboard-charts"
import { ActivityFeed } from "@/components/crm/activity-feed"
import { deals, contacts, formatCurrency } from "@/lib/data"

const totalRevenue = deals
  .filter((d) => d.stage === "closed-won")
  .reduce((sum, d) => sum + d.value, 0)
const pipelineValue = deals
  .filter((d) => !d.stage.startsWith("closed"))
  .reduce((sum, d) => sum + d.value, 0)
const activeDeals = deals.filter((d) => !d.stage.startsWith("closed")).length
const activeContacts = contacts.filter((c) => c.status === "active").length

const metrics = [
  {
    title: "Total Revenue",
    value: formatCurrency(totalRevenue),
    change: "+12.5%",
    icon: DollarSign,
  },
  {
    title: "Pipeline Value",
    value: formatCurrency(pipelineValue),
    change: "+8.2%",
    icon: TrendingUp,
  },
  {
    title: "Active Deals",
    value: activeDeals.toString(),
    change: "+3",
    icon: Handshake,
  },
  {
    title: "Active Contacts",
    value: activeContacts.toString(),
    change: "+5",
    icon: Users,
  },
]

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your sales pipeline</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardDescription>{metric.title}</CardDescription>
              <metric.icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              <p className="text-xs text-emerald-600">{metric.change} from last month</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>Monthly revenue over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <RevenueChart />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Pipeline by Stage</CardTitle>
            <CardDescription>Deal value across pipeline stages</CardDescription>
          </CardHeader>
          <CardContent>
            <PipelineChart />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardAction>
            <Badge variant="secondary">8 activities</Badge>
          </CardAction>
        </CardHeader>
        <CardContent>
          <ActivityFeed />
        </CardContent>
      </Card>
    </div>
  )
}
