"use client"

import * as React from "react"
import { SearchIcon, Globe, Users, Handshake } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { companies } from "@/lib/data"

const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
  customer: "default",
  prospect: "outline",
  partner: "secondary",
}

export default function CompaniesPage() {
  const [search, setSearch] = React.useState("")

  const filtered = companies.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.industry.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Companies</h1>
        <p className="text-muted-foreground">Manage accounts and organizations</p>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search companies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((company) => (
          <Card key={company.id} className="cursor-pointer transition-shadow hover:shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{company.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{company.industry}</p>
                </div>
                <Badge variant={statusVariant[company.status]}>
                  {company.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Globe className="size-3.5" />
                  <span>{company.website}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="size-3.5" />
                  <span>{company.employees}</span>
                </div>
                <div className="text-muted-foreground">
                  <span className="font-medium text-foreground">{company.contacts}</span> contacts
                </div>
                <div className="text-muted-foreground">
                  <span className="font-medium text-foreground">{company.deals}</span> deals
                </div>
              </div>
              <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                Revenue: {company.revenue}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
