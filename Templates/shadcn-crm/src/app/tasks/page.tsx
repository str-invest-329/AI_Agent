"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertCircle,
  ArrowUp,
  ArrowRight,
  ArrowDown,
  Circle,
  Clock,
  CheckCircle2,
} from "lucide-react"
import { tasks, type Task } from "@/lib/data"

const priorityConfig: Record<string, { icon: typeof ArrowUp; color: string; label: string }> = {
  urgent: { icon: AlertCircle, color: "text-red-600", label: "Urgent" },
  high: { icon: ArrowUp, color: "text-orange-600", label: "High" },
  medium: { icon: ArrowRight, color: "text-yellow-600", label: "Medium" },
  low: { icon: ArrowDown, color: "text-blue-600", label: "Low" },
}

const statusConfig: Record<string, { icon: typeof Circle; color: string }> = {
  todo: { icon: Circle, color: "text-slate-400" },
  "in-progress": { icon: Clock, color: "text-blue-500" },
  done: { icon: CheckCircle2, color: "text-green-500" },
}

function TaskCard({ task }: { task: Task }) {
  const priority = priorityConfig[task.priority]
  const status = statusConfig[task.status]
  const PriorityIcon = priority.icon
  const StatusIcon = status.icon

  return (
    <Card className="cursor-pointer transition-shadow hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <StatusIcon className={`mt-0.5 size-5 shrink-0 ${status.color}`} />
          <div className="flex-1 space-y-1">
            <p className="text-sm font-medium leading-tight">{task.title}</p>
            <p className="text-xs text-muted-foreground">{task.description}</p>
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <Badge variant="outline" className="text-xs">
                <PriorityIcon className={`mr-1 size-3 ${priority.color}`} />
                {priority.label}
              </Badge>
              {task.relatedTo && (
                <Badge variant="secondary" className="text-xs">
                  {task.relatedTo}
                </Badge>
              )}
              <span className="ml-auto text-xs text-muted-foreground">
                Due {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function TasksPage() {
  const todoTasks = tasks.filter((t) => t.status === "todo")
  const inProgressTasks = tasks.filter((t) => t.status === "in-progress")
  const doneTasks = tasks.filter((t) => t.status === "done")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
        <p className="text-muted-foreground">Track your to-dos and follow-ups</p>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All ({tasks.length})</TabsTrigger>
          <TabsTrigger value="todo">To Do ({todoTasks.length})</TabsTrigger>
          <TabsTrigger value="in-progress">In Progress ({inProgressTasks.length})</TabsTrigger>
          <TabsTrigger value="done">Done ({doneTasks.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <div className="space-y-3">
            {tasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="todo" className="mt-4">
          <div className="space-y-3">
            {todoTasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="in-progress" className="mt-4">
          <div className="space-y-3">
            {inProgressTasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="done" className="mt-4">
          <div className="space-y-3">
            {doneTasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
