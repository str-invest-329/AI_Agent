"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Building2,
  CheckSquare,
  Handshake,
  LayoutDashboard,
  Users,
} from "lucide-react"

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import { contacts, deals, companies } from "@/lib/data"

export function CommandPalette() {
  const [open, setOpen] = React.useState(false)
  const router = useRouter()

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const navigate = (href: string) => {
    setOpen(false)
    router.push(href)
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search contacts, deals, companies..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Pages">
          <CommandItem onSelect={() => navigate("/")}>
            <LayoutDashboard className="mr-2 size-4" />
            Dashboard
            <CommandShortcut>Go</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => navigate("/contacts")}>
            <Users className="mr-2 size-4" />
            Contacts
          </CommandItem>
          <CommandItem onSelect={() => navigate("/deals")}>
            <Handshake className="mr-2 size-4" />
            Deals
          </CommandItem>
          <CommandItem onSelect={() => navigate("/companies")}>
            <Building2 className="mr-2 size-4" />
            Companies
          </CommandItem>
          <CommandItem onSelect={() => navigate("/tasks")}>
            <CheckSquare className="mr-2 size-4" />
            Tasks
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Contacts">
          {contacts.slice(0, 5).map((contact) => (
            <CommandItem key={contact.id} onSelect={() => navigate("/contacts")}>
              <Users className="mr-2 size-4" />
              {contact.name}
              <span className="ml-2 text-xs text-muted-foreground">{contact.company}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Deals">
          {deals.slice(0, 5).map((deal) => (
            <CommandItem key={deal.id} onSelect={() => navigate("/deals")}>
              <Handshake className="mr-2 size-4" />
              {deal.title}
              <span className="ml-2 text-xs text-muted-foreground">{deal.company}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Companies">
          {companies.slice(0, 5).map((company) => (
            <CommandItem key={company.id} onSelect={() => navigate("/companies")}>
              <Building2 className="mr-2 size-4" />
              {company.name}
              <span className="ml-2 text-xs text-muted-foreground">{company.industry}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
