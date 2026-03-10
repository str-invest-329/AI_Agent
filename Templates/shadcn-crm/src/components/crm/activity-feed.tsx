"use client"

import { Mail, Phone, Calendar, StickyNote, Handshake } from "lucide-react"
import { activities } from "@/lib/data"

const iconMap = {
  call: Phone,
  email: Mail,
  meeting: Calendar,
  note: StickyNote,
  deal: Handshake,
}

const colorMap = {
  call: "text-green-600 bg-green-50",
  email: "text-blue-600 bg-blue-50",
  meeting: "text-purple-600 bg-purple-50",
  note: "text-amber-600 bg-amber-50",
  deal: "text-emerald-600 bg-emerald-50",
}

export function ActivityFeed() {
  return (
    <div className="space-y-4">
      {activities.map((activity) => {
        const Icon = iconMap[activity.type]
        return (
          <div key={activity.id} className="flex items-start gap-3">
            <div className={`flex size-8 shrink-0 items-center justify-center rounded-full ${colorMap[activity.type]}`}>
              <Icon className="size-4" />
            </div>
            <div className="flex-1 space-y-1">
              <p className="text-sm">{activity.description}</p>
              <p className="text-xs text-muted-foreground">
                {activity.contact} &middot;{" "}
                {new Date(activity.timestamp).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
