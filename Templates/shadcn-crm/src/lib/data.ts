// Mock data for the CRM application

export type Contact = {
  id: string
  name: string
  email: string
  company: string
  role: string
  phone: string
  status: "active" | "inactive" | "lead"
  lastContact: string
  avatar?: string
}

export type Deal = {
  id: string
  title: string
  value: number
  company: string
  contact: string
  stage: "lead" | "qualified" | "proposal" | "negotiation" | "closed-won" | "closed-lost"
  probability: number
  expectedClose: string
  createdAt: string
}

export type Company = {
  id: string
  name: string
  industry: string
  website: string
  employees: string
  revenue: string
  contacts: number
  deals: number
  status: "customer" | "prospect" | "partner"
}

export type Task = {
  id: string
  title: string
  description: string
  assignee: string
  dueDate: string
  priority: "low" | "medium" | "high" | "urgent"
  status: "todo" | "in-progress" | "done"
  relatedTo?: string
}

export type Activity = {
  id: string
  type: "call" | "email" | "meeting" | "note" | "deal"
  description: string
  contact: string
  timestamp: string
}

export const contacts: Contact[] = [
  { id: "1", name: "Sarah Chen", email: "sarah@acme.com", company: "Acme Corp", role: "VP of Engineering", phone: "+1 555-0101", status: "active", lastContact: "2026-03-08" },
  { id: "2", name: "Marcus Johnson", email: "marcus@globex.com", company: "Globex Inc", role: "CTO", phone: "+1 555-0102", status: "active", lastContact: "2026-03-07" },
  { id: "3", name: "Emily Rodriguez", email: "emily@initech.com", company: "Initech", role: "Product Manager", phone: "+1 555-0103", status: "lead", lastContact: "2026-03-05" },
  { id: "4", name: "David Kim", email: "david@wayneent.com", company: "Wayne Enterprises", role: "Director of IT", phone: "+1 555-0104", status: "active", lastContact: "2026-03-09" },
  { id: "5", name: "Lisa Park", email: "lisa@stark.com", company: "Stark Industries", role: "Head of Procurement", phone: "+1 555-0105", status: "inactive", lastContact: "2026-02-15" },
  { id: "6", name: "James Wright", email: "james@umbrella.com", company: "Umbrella Corp", role: "CEO", phone: "+1 555-0106", status: "lead", lastContact: "2026-03-10" },
  { id: "7", name: "Ana Silva", email: "ana@cyberdyne.com", company: "Cyberdyne Systems", role: "Sales Director", phone: "+1 555-0107", status: "active", lastContact: "2026-03-06" },
  { id: "8", name: "Tom Baker", email: "tom@oscorp.com", company: "Oscorp", role: "CFO", phone: "+1 555-0108", status: "active", lastContact: "2026-03-04" },
]

export const deals: Deal[] = [
  { id: "1", title: "Acme Enterprise License", value: 120000, company: "Acme Corp", contact: "Sarah Chen", stage: "negotiation", probability: 75, expectedClose: "2026-04-15", createdAt: "2026-01-10" },
  { id: "2", title: "Globex Platform Migration", value: 85000, company: "Globex Inc", contact: "Marcus Johnson", stage: "proposal", probability: 50, expectedClose: "2026-05-01", createdAt: "2026-02-01" },
  { id: "3", title: "Initech SaaS Onboarding", value: 45000, company: "Initech", contact: "Emily Rodriguez", stage: "qualified", probability: 30, expectedClose: "2026-06-01", createdAt: "2026-02-20" },
  { id: "4", title: "Wayne IT Infrastructure", value: 250000, company: "Wayne Enterprises", contact: "David Kim", stage: "lead", probability: 15, expectedClose: "2026-07-01", createdAt: "2026-03-01" },
  { id: "5", title: "Stark Procurement Suite", value: 180000, company: "Stark Industries", contact: "Lisa Park", stage: "closed-won", probability: 100, expectedClose: "2026-03-01", createdAt: "2025-12-01" },
  { id: "6", title: "Umbrella Analytics Platform", value: 95000, company: "Umbrella Corp", contact: "James Wright", stage: "lead", probability: 10, expectedClose: "2026-08-01", createdAt: "2026-03-05" },
  { id: "7", title: "Cyberdyne CRM Integration", value: 67000, company: "Cyberdyne Systems", contact: "Ana Silva", stage: "proposal", probability: 45, expectedClose: "2026-05-15", createdAt: "2026-02-10" },
  { id: "8", title: "Oscorp Financial Module", value: 135000, company: "Oscorp", contact: "Tom Baker", stage: "negotiation", probability: 65, expectedClose: "2026-04-30", createdAt: "2026-01-20" },
  { id: "9", title: "Acme Support Contract", value: 36000, company: "Acme Corp", contact: "Sarah Chen", stage: "closed-won", probability: 100, expectedClose: "2026-02-15", createdAt: "2025-11-15" },
  { id: "10", title: "Globex Data Warehouse", value: 200000, company: "Globex Inc", contact: "Marcus Johnson", stage: "qualified", probability: 25, expectedClose: "2026-07-15", createdAt: "2026-03-08" },
]

export const companies: Company[] = [
  { id: "1", name: "Acme Corp", industry: "Technology", website: "acme.com", employees: "500-1000", revenue: "$50M-$100M", contacts: 3, deals: 2, status: "customer" },
  { id: "2", name: "Globex Inc", industry: "Manufacturing", website: "globex.com", employees: "1000-5000", revenue: "$100M-$500M", contacts: 2, deals: 2, status: "customer" },
  { id: "3", name: "Initech", industry: "Software", website: "initech.com", employees: "100-500", revenue: "$10M-$50M", contacts: 1, deals: 1, status: "prospect" },
  { id: "4", name: "Wayne Enterprises", industry: "Conglomerate", website: "wayneent.com", employees: "10000+", revenue: "$1B+", contacts: 1, deals: 1, status: "prospect" },
  { id: "5", name: "Stark Industries", industry: "Defense & Tech", website: "stark.com", employees: "5000-10000", revenue: "$500M-$1B", contacts: 1, deals: 1, status: "customer" },
  { id: "6", name: "Umbrella Corp", industry: "Biotechnology", website: "umbrella.com", employees: "1000-5000", revenue: "$100M-$500M", contacts: 1, deals: 1, status: "prospect" },
  { id: "7", name: "Cyberdyne Systems", industry: "AI & Robotics", website: "cyberdyne.com", employees: "500-1000", revenue: "$50M-$100M", contacts: 1, deals: 1, status: "partner" },
  { id: "8", name: "Oscorp", industry: "Pharmaceuticals", website: "oscorp.com", employees: "1000-5000", revenue: "$100M-$500M", contacts: 1, deals: 1, status: "customer" },
]

export const tasks: Task[] = [
  { id: "1", title: "Follow up with Sarah Chen", description: "Send proposal revision for enterprise license", assignee: "You", dueDate: "2026-03-12", priority: "high", status: "todo", relatedTo: "Acme Enterprise License" },
  { id: "2", title: "Prepare demo for Globex", description: "Set up sandbox environment for platform migration demo", assignee: "You", dueDate: "2026-03-14", priority: "medium", status: "in-progress", relatedTo: "Globex Platform Migration" },
  { id: "3", title: "Schedule call with Emily", description: "Discuss product requirements for SaaS onboarding", assignee: "You", dueDate: "2026-03-11", priority: "high", status: "todo", relatedTo: "Initech SaaS Onboarding" },
  { id: "4", title: "Send pricing to Wayne Enterprises", description: "Prepare custom pricing for IT infrastructure deal", assignee: "You", dueDate: "2026-03-15", priority: "medium", status: "todo", relatedTo: "Wayne IT Infrastructure" },
  { id: "5", title: "Update CRM records", description: "Clean up duplicate contacts and merge records", assignee: "You", dueDate: "2026-03-13", priority: "low", status: "todo" },
  { id: "6", title: "Quarterly review prep", description: "Compile Q1 sales metrics and pipeline analysis", assignee: "You", dueDate: "2026-03-20", priority: "medium", status: "in-progress" },
  { id: "7", title: "Contract review - Oscorp", description: "Review legal terms for financial module contract", assignee: "You", dueDate: "2026-03-16", priority: "urgent", status: "todo", relatedTo: "Oscorp Financial Module" },
  { id: "8", title: "Onboard Stark Industries", description: "Set up accounts and training sessions", assignee: "You", dueDate: "2026-03-10", priority: "high", status: "done", relatedTo: "Stark Procurement Suite" },
]

export const activities: Activity[] = [
  { id: "1", type: "deal", description: "Moved 'Acme Enterprise License' to Negotiation", contact: "Sarah Chen", timestamp: "2026-03-10T09:30:00" },
  { id: "2", type: "email", description: "Sent proposal to Marcus Johnson", contact: "Marcus Johnson", timestamp: "2026-03-10T08:15:00" },
  { id: "3", type: "call", description: "Discovery call with James Wright (30 min)", contact: "James Wright", timestamp: "2026-03-09T16:00:00" },
  { id: "4", type: "meeting", description: "Product demo with Initech team", contact: "Emily Rodriguez", timestamp: "2026-03-09T14:00:00" },
  { id: "5", type: "note", description: "David Kim interested in extended support plan", contact: "David Kim", timestamp: "2026-03-09T11:00:00" },
  { id: "6", type: "deal", description: "Closed 'Stark Procurement Suite' - Won!", contact: "Lisa Park", timestamp: "2026-03-08T17:00:00" },
  { id: "7", type: "email", description: "Follow-up email to Ana Silva re: integration timeline", contact: "Ana Silva", timestamp: "2026-03-08T10:30:00" },
  { id: "8", type: "call", description: "Pricing discussion with Tom Baker", contact: "Tom Baker", timestamp: "2026-03-07T15:00:00" },
]

export const stageOrder = ["lead", "qualified", "proposal", "negotiation", "closed-won", "closed-lost"] as const

export const stageLabels: Record<string, string> = {
  lead: "Lead",
  qualified: "Qualified",
  proposal: "Proposal",
  negotiation: "Negotiation",
  "closed-won": "Closed Won",
  "closed-lost": "Closed Lost",
}

export const stageColors: Record<string, string> = {
  lead: "bg-slate-100 text-slate-700",
  qualified: "bg-blue-100 text-blue-700",
  proposal: "bg-purple-100 text-purple-700",
  negotiation: "bg-amber-100 text-amber-700",
  "closed-won": "bg-green-100 text-green-700",
  "closed-lost": "bg-red-100 text-red-700",
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(value)
}
