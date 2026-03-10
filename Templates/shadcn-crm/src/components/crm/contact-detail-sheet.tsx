"use client"

import { Mail, Phone, Building2, Briefcase, Calendar } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { type Contact } from "@/lib/data"

const statusVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  active: "default",
  inactive: "secondary",
  lead: "outline",
}

export function ContactDetailSheet({
  contact,
  open,
  onOpenChange,
}: {
  contact: Contact | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  if (!contact) return null

  const initials = contact.name
    .split(" ")
    .map((n) => n[0])
    .join("")

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <Avatar className="size-12">
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <SheetTitle>{contact.name}</SheetTitle>
              <SheetDescription>{contact.role} at {contact.company}</SheetDescription>
            </div>
          </div>
        </SheetHeader>
        <div className="mt-6 space-y-6">
          <div>
            <Badge variant={statusVariant[contact.status]}>
              {contact.status}
            </Badge>
          </div>
          <Separator />
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Contact Information</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="size-4 text-muted-foreground" />
                <span>{contact.email}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Phone className="size-4 text-muted-foreground" />
                <span>{contact.phone}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Building2 className="size-4 text-muted-foreground" />
                <span>{contact.company}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Briefcase className="size-4 text-muted-foreground" />
                <span>{contact.role}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="size-4 text-muted-foreground" />
                <span>Last contact: {new Date(contact.lastContact).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
