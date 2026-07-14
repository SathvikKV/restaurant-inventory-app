"use client"

import { Bell, ChevronRight, Package, ShoppingCart, AlertTriangle, Pencil, Sparkles } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  attentionItems,
  aiRecommendations,
  formatCurrency,
} from "@/lib/kosh-data"
import { useKosh } from "../store"

function Gauge({ value, max = 100 }: { value: number; max?: number }) {
  const pct = value / max
  const r = 52
  const c = 2 * Math.PI * r
  const dash = c * pct
  return (
    <div className="relative size-36 shrink-0">
      <svg viewBox="0 0 120 120" className="size-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--muted)" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-semibold tracking-tight text-primary">{value}</span>
        <span className="text-xs text-muted-foreground">/ {max}</span>
      </div>
    </div>
  )
}

function Greeting({ name }: { name: string }) {
  const { navigate } = useKosh()
  return (
    <header className="flex items-center justify-between">
      <h1 className="text-xl font-semibold tracking-tight">
        Good Morning, {name} <span aria-hidden>👋</span>
      </h1>
      <Button
        variant="ghost"
        size="icon"
        className="relative shrink-0"
        aria-label="Notifications"
        onClick={() => navigate("notifications")}
      >
        <Bell />
        <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-destructive" />
      </Button>
    </header>
  )
}

export function OwnerHome() {
  const { navigate } = useKosh()
  return (
    <div className="flex flex-col gap-4">
      <Greeting name="Aditya" />

      <Card className="rounded-xl shadow-sm">
        <CardContent className="flex items-center gap-5">
          <Gauge value={94} />
          <div>
            <p className="text-sm text-muted-foreground">Inventory Health</p>
            <p className="mt-1 text-lg font-semibold">Excellent</p>
            <p className="mt-1 text-sm text-muted-foreground">3 items need attention</p>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">Needs Attention</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          {attentionItems.map((a) => (
            <button
              key={a.id}
              onClick={() => navigate("item-detail", { id: a.label.toLowerCase() })}
              className="flex items-center justify-between rounded-lg py-2 text-left transition-colors hover:bg-muted"
            >
              <span className="flex items-center gap-2.5">
                <span
                  className={cn(
                    "size-2.5 rounded-full",
                    a.level === "danger" ? "bg-destructive" : "bg-accent",
                  )}
                />
                <span className="font-medium">{a.label}</span>
              </span>
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                {a.note}
                <ChevronRight className="size-4" />
              </span>
            </button>
          ))}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card className="rounded-xl shadow-sm">
          <CardContent className="flex flex-col gap-1">
            <p className="text-sm text-muted-foreground">Today&apos;s Purchases</p>
            <p className="text-2xl font-semibold tracking-tight">{formatCurrency(42300)}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl shadow-sm">
          <CardContent className="flex flex-col gap-1">
            <p className="text-sm text-muted-foreground">Today&apos;s Consumption</p>
            <p className="text-2xl font-semibold tracking-tight">{formatCurrency(31400)}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-xl shadow-sm">
        <CardContent className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Today&apos;s Wastage</p>
            <p className="text-2xl font-semibold tracking-tight text-destructive">{formatCurrency(2100)}</p>
          </div>
          <span className="flex size-11 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="size-5" />
          </span>
        </CardContent>
      </Card>

      <Card className="rounded-xl border-0 bg-primary text-primary-foreground shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-primary-foreground">
            <Sparkles className="size-5" />
            AI Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <ul className="flex flex-col gap-2 text-sm">
            {aiRecommendations.map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => navigate("ai-recommendation", { id: r.id })}
                  className="flex w-full items-center gap-2 text-left"
                >
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary-foreground/70" />
                  <span className="flex-1">{r.title}</span>
                  <ChevronRight className="size-4 opacity-70" />
                </button>
              </li>
            ))}
          </ul>
          <Button
            variant="outline"
            className="w-full border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
            onClick={() => navigate("ai-recommendation", { id: aiRecommendations[0].id })}
          >
            View All Recommendations
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

const tasks = [
  { id: "t1", icon: Package, emoji: "📦", label: "Receive Deliveries", badge: "2 pending", screen: "receive-list" },
  { id: "t2", icon: ShoppingCart, emoji: "🛒", label: "Pending POs", badge: "3", screen: "purchases" },
  { id: "t3", icon: AlertTriangle, emoji: "⚠️", label: "Low Stock Items", badge: "5", screen: "inventory" },
  { id: "t4", icon: Pencil, emoji: "✏️", label: "Pending Corrections", badge: "2", screen: "corrections" },
]

export function ManagerHome() {
  const { navigate, setTab } = useKosh()
  return (
    <div className="flex flex-col gap-4">
      <Greeting name="Ramesh" />

      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Today&apos;s Tasks</p>
        <div className="flex flex-col gap-3">
          {tasks.map((t) => (
            <Card
              key={t.id}
              className="cursor-pointer rounded-xl shadow-sm transition-colors hover:bg-muted/50"
              onClick={() => {
                if (t.screen === "purchases") setTab("purchases")
                else if (t.screen === "inventory") setTab("inventory")
                else navigate(t.screen)
              }}
            >
              <CardContent className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-lg bg-secondary/25 text-lg">
                  {t.emoji}
                </span>
                <span className="flex-1 font-medium">{t.label}</span>
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                  {t.badge}
                </span>
                <ChevronRight className="size-4 text-muted-foreground" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="rounded-xl shadow-sm">
          <CardContent className="flex flex-col gap-1">
            <p className="text-sm text-muted-foreground">Today&apos;s Issues</p>
            <p className="text-2xl font-semibold tracking-tight">6 entries</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl shadow-sm">
          <CardContent className="flex flex-col gap-1">
            <p className="text-sm text-muted-foreground">Today&apos;s Wastage</p>
            <p className="text-2xl font-semibold tracking-tight">3 entries</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
