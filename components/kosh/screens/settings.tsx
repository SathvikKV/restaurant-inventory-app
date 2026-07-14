"use client"

import * as React from "react"
import {
  Store,
  Users,
  Plug,
  Settings,
  LifeBuoy,
  ScrollText,
  Bell,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  ToggleRight,
  Phone,
  Mail,
  MessageSquare,
  ExternalLink,
  Check,
  AlertCircle,
  Info,
  Shield,
  UserPlus,
  MapPin,
} from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { restaurants } from "@/lib/kosh-data"
import { ScreenHeader } from "../parts"
import { useKosh } from "../store"

// ─── Restaurants Screen ────────────────────────────────────────────────────

export function RestaurantsScreen() {
  const { restaurantId, setRestaurantId } = useKosh()
  const [items, setItems] = React.useState(restaurants)

  return (
    <div className="flex flex-col gap-4">
      <ScreenHeader
        title="Restaurants"
        subtitle="Manage your restaurant locations"
        right={
          <Button size="sm" onClick={() => toast("Add new restaurant — coming soon")}>
            <Plus className="size-4" />
            Add
          </Button>
        }
      />

      <div className="flex flex-col gap-3">
        {items.map((r) => {
          const active = r.id === restaurantId
          return (
            <Card
              key={r.id}
              className={cn(
                "cursor-pointer rounded-xl shadow-sm transition-all",
                active ? "border-primary/50 ring-1 ring-primary/20" : "",
              )}
              onClick={() => setRestaurantId(r.id)}
            >
              <CardContent className="flex items-center gap-4 py-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Store className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{r.name}</p>
                  <p className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="size-3" />
                    {r.area}, {r.city}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {active && (
                    <Badge className="bg-primary/10 text-primary" variant="secondary">
                      Active
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      toast(`Edit ${r.name} — ${r.area}`)
                    }}
                    aria-label={`Edit ${r.name}`}
                  >
                    <Pencil className="size-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Button
        variant="outline"
        className="h-11 w-full rounded-lg"
        onClick={() => toast("Add new restaurant — coming soon")}
      >
        <Plus data-icon="inline-start" />
        Add New Restaurant
      </Button>
    </div>
  )
}

// ─── Users & Roles Screen ──────────────────────────────────────────────────

type UserRole = "owner" | "manager" | "staff"

const mockUsers = [
  { id: "u1", name: "Aditya Sharma", phone: "+91 98765 43210", role: "owner" as UserRole, active: true },
  { id: "u2", name: "Ramesh Kumar", phone: "+91 91234 56789", role: "manager" as UserRole, active: true },
  { id: "u3", name: "Priya Patel", phone: "+91 87654 32109", role: "manager" as UserRole, active: true },
  { id: "u4", name: "Suresh Nair", phone: "+91 76543 21098", role: "staff" as UserRole, active: false },
]

const roleColors: Record<UserRole, string> = {
  owner: "bg-primary/10 text-primary",
  manager: "bg-accent/15 text-amber-700",
  staff: "bg-secondary/30 text-secondary-foreground",
}

export function UsersScreen() {
  const [users, setUsers] = React.useState(mockUsers)

  function toggleActive(id: string) {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === id) {
          const next = { ...u, active: !u.active }
          toast(next.active ? `${u.name} activated` : `${u.name} deactivated`)
          return next
        }
        return u
      }),
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <ScreenHeader
        title="Users & Roles"
        subtitle="Manage team access"
        right={
          <Button size="sm" onClick={() => toast("Invite user — coming soon")}>
            <UserPlus className="size-4" />
            Invite
          </Button>
        }
      />

      <div className="flex flex-col gap-3">
        {users.map((u) => (
          <Card key={u.id} className="rounded-xl shadow-sm">
            <CardContent className="flex items-center gap-3 py-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary/30 text-secondary-foreground font-semibold text-sm">
                {u.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{u.name}</p>
                  {!u.active && (
                    <Badge variant="secondary" className="text-xs text-muted-foreground">
                      Inactive
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="secondary" className={cn("text-xs", roleColors[u.role])}>
                    {u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{u.phone}</span>
                </div>
              </div>
              <button
                onClick={() => toggleActive(u.id)}
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-full transition-colors",
                  u.active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                )}
                aria-label={u.active ? "Deactivate user" : "Activate user"}
              >
                <ToggleRight className="size-5" />
              </button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-xl border-dashed shadow-sm">
        <CardContent className="py-4">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2">Roles</p>
          <div className="flex flex-col gap-2">
            {[
              { role: "Owner", desc: "Full access to all features and settings" },
              { role: "Manager", desc: "Can manage inventory, POs, and wastage" },
              { role: "Staff", desc: "Can view inventory and record transactions" },
            ].map((r) => (
              <div key={r.role} className="flex items-start gap-2">
                <Shield className="size-4 mt-0.5 shrink-0 text-primary" />
                <div>
                  <span className="text-sm font-medium">{r.role}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{r.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Audit Logs Screen ─────────────────────────────────────────────────────

const auditLogs = [
  { id: "l1", user: "Aditya S.", action: "Approved PO #1234", detail: "Chicken — 20 kg from Supplier A", time: "Today, 9:42 AM", type: "approval" },
  { id: "l2", user: "Ramesh K.", action: "Received Delivery", detail: "PO #1231 — Rice 50 kg", time: "Today, 8:15 AM", type: "delivery" },
  { id: "l3", user: "Priya P.", action: "Recorded Wastage", detail: "Butter — 0.5 kg (Spoiled)", time: "Yesterday, 6:30 PM", type: "wastage" },
  { id: "l4", user: "Ramesh K.", action: "Issued Stock", detail: "Chicken — 9 kg to Kitchen", time: "Yesterday, 2:15 PM", type: "issue" },
  { id: "l5", user: "Aditya S.", action: "Rejected PO #1228", detail: "Tomato — 25 kg from Supplier B", time: "Yesterday, 11:05 AM", type: "rejection" },
  { id: "l6", user: "Priya P.", action: "Stock Adjustment", detail: "Paneer corrected from 13.5 kg to 12 kg", time: "2 days ago", type: "adjustment" },
  { id: "l7", user: "Ramesh K.", action: "Created PO #1234", detail: "Chicken — 20 kg from Supplier A", time: "2 days ago", type: "creation" },
]

const logTypeStyles: Record<string, { icon: React.ComponentType<{className?: string}>; color: string }> = {
  approval: { icon: Check, color: "text-primary bg-primary/10" },
  delivery: { icon: Check, color: "text-primary bg-primary/10" },
  wastage: { icon: Trash2, color: "text-destructive bg-destructive/10" },
  issue: { icon: ChevronRight, color: "text-accent bg-accent/10" },
  rejection: { icon: AlertCircle, color: "text-destructive bg-destructive/10" },
  adjustment: { icon: Pencil, color: "text-accent bg-accent/10" },
  creation: { icon: Plus, color: "text-primary bg-primary/10" },
}

export function AuditLogsScreen() {
  const [search, setSearch] = React.useState("")
  const filtered = auditLogs.filter(
    (l) =>
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.user.toLowerCase().includes(search.toLowerCase()) ||
      l.detail.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="flex flex-col gap-4">
      <ScreenHeader title="Audit Logs" subtitle="All inventory activity" />

      <div className="flex items-center gap-2 rounded-lg border border-input bg-card px-3">
        <ScrollText className="size-4 shrink-0 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search logs..."
          className="border-0 px-0 shadow-none focus-visible:ring-0"
        />
      </div>

      <Card className="rounded-xl shadow-sm">
        <CardContent className="flex flex-col py-1">
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No logs found</p>
          ) : (
            filtered.map((log, i) => {
              const style = logTypeStyles[log.type] ?? logTypeStyles.creation
              const IconComp = style.icon
              return (
                <React.Fragment key={log.id}>
                  {i > 0 && <Separator />}
                  <div className="flex items-start gap-3 py-3">
                    <span className={cn("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full", style.color)}>
                      <IconComp className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{log.action}</p>
                      <p className="text-xs text-muted-foreground">{log.detail}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {log.user} · {log.time}
                      </p>
                    </div>
                  </div>
                </React.Fragment>
              )
            })
          )}
        </CardContent>
      </Card>

      <Button variant="link" className="self-center text-sm" onClick={() => toast("Export logs — coming soon")}>
        Export as CSV
      </Button>
    </div>
  )
}

// ─── Integrations Screen ───────────────────────────────────────────────────

const integrations = [
  {
    id: "whatsapp",
    name: "WhatsApp Business",
    desc: "Upload invoices via WhatsApp",
    icon: "💬",
    connected: true,
    status: "Connected to +91 98765 43210",
  },
  {
    id: "pos",
    name: "POS System",
    desc: "Sync sales data for consumption",
    icon: "🖥️",
    connected: false,
    status: "Not connected",
  },
  {
    id: "tally",
    name: "Tally ERP",
    desc: "Sync purchase orders and invoices",
    icon: "📊",
    connected: false,
    status: "Not connected",
  },
  {
    id: "zoho",
    name: "Zoho Books",
    desc: "Export purchase data to Zoho",
    icon: "📘",
    connected: false,
    status: "Not connected",
  },
]

export function IntegrationsScreen() {
  const [items, setItems] = React.useState(integrations)

  function toggle(id: string) {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id === id) {
          const next = !it.connected
          toast(next ? `${it.name} connected` : `${it.name} disconnected`)
          return { ...it, connected: next, status: next ? "Connected" : "Not connected" }
        }
        return it
      }),
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <ScreenHeader title="Integrations" subtitle="Connect your tools" />

      <div className="flex flex-col gap-3">
        {items.map((it) => (
          <Card key={it.id} className="rounded-xl shadow-sm">
            <CardContent className="flex items-center gap-4 py-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted text-2xl">
                {it.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{it.name}</p>
                <p className="text-xs text-muted-foreground">{it.desc}</p>
                <p className={cn("mt-1 text-xs", it.connected ? "text-primary" : "text-muted-foreground")}>
                  {it.status}
                </p>
              </div>
              <Button
                size="sm"
                variant={it.connected ? "outline" : "default"}
                className={cn("shrink-0", it.connected && "border-destructive/40 text-destructive hover:bg-destructive/5 hover:text-destructive")}
                onClick={() => toggle(it.id)}
              >
                {it.connected ? "Disconnect" : "Connect"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-xl bg-muted/50 shadow-sm">
        <CardContent className="flex items-start gap-3 py-4">
          <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Integrations sync your data automatically. Contact support if you need help setting up a specific integration.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Settings Screen ───────────────────────────────────────────────────────

export function SettingsScreen() {
  const [lowStockAlert, setLowStockAlert] = React.useState(true)
  const [wasteAlert, setWasteAlert] = React.useState(true)
  const [aiNotif, setAiNotif] = React.useState(true)
  const [dailySummary, setDailySummary] = React.useState(false)

  const toggleSetting = (
    value: boolean,
    setter: (v: boolean) => void,
    label: string,
  ) => {
    const next = !value
    setter(next)
    toast(next ? `${label} enabled` : `${label} disabled`)
  }

  return (
    <div className="flex flex-col gap-4">
      <ScreenHeader title="Settings" />

      <div className="flex flex-col gap-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Notifications</p>
        <Card className="rounded-xl shadow-sm">
          <CardContent className="flex flex-col py-1">
            {[
              { label: "Low Stock Alerts", desc: "Alert when items hit critical levels", value: lowStockAlert, setter: setLowStockAlert },
              { label: "Wastage Alerts", desc: "Alert on high wastage patterns", value: wasteAlert, setter: setWasteAlert },
              { label: "AI Recommendations", desc: "Get AI-powered ordering suggestions", value: aiNotif, setter: setAiNotif },
              { label: "Daily Summary", desc: "Receive daily inventory digest", value: dailySummary, setter: setDailySummary },
            ].map((s, i) => (
              <React.Fragment key={s.label}>
                {i > 0 && <Separator />}
                <div className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-medium">{s.label}</p>
                    <p className="text-xs text-muted-foreground">{s.desc}</p>
                  </div>
                  <button
                    onClick={() => toggleSetting(s.value, s.setter, s.label)}
                    className={cn(
                      "relative flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
                      s.value ? "bg-primary" : "bg-muted",
                    )}
                    aria-checked={s.value}
                    role="switch"
                  >
                    <span
                      className={cn(
                        "absolute size-5 rounded-full bg-white shadow-sm transition-transform",
                        s.value ? "translate-x-[22px]" : "translate-x-[2px]",
                      )}
                    />
                  </button>
                </div>
              </React.Fragment>
            ))}
          </CardContent>
        </Card>

        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Thresholds</p>
        <Card className="rounded-xl shadow-sm">
          <CardContent className="flex flex-col gap-3 py-4">
            <div>
              <label className="text-sm font-medium">Low Stock Threshold</label>
              <p className="text-xs text-muted-foreground mb-2">Alert when stock falls below X days of supply</p>
              <div className="flex items-center gap-3">
                <Input type="number" defaultValue={3} className="h-9 w-20" />
                <span className="text-sm text-muted-foreground">days</span>
              </div>
            </div>
            <Separator />
            <div>
              <label className="text-sm font-medium">Critical Stock Threshold</label>
              <p className="text-xs text-muted-foreground mb-2">Mark as critical when stock falls below X days</p>
              <div className="flex items-center gap-3">
                <Input type="number" defaultValue={1} className="h-9 w-20" />
                <span className="text-sm text-muted-foreground">days</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button className="h-11 w-full rounded-lg" onClick={() => toast("Settings saved")}>
          Save Changes
        </Button>
      </div>
    </div>
  )
}

// ─── Help & Support Screen ─────────────────────────────────────────────────

export function HelpScreen() {
  const faqs = [
    { q: "How do I add a new inventory item?", a: "Go to Inventory → tap the + button, fill in item details and save." },
    { q: "How does the AI recommendation work?", a: "Kosh analyzes your usage trends and stock levels to suggest optimal order quantities and suppliers." },
    { q: "Can I upload invoices via WhatsApp?", a: "Yes! Connect WhatsApp in Integrations, then send invoice photos to your Kosh WhatsApp number." },
    { q: "How do I add team members?", a: "Go to More → Users & Roles → tap Invite. They'll receive a login OTP to join." },
    { q: "What happens when I reject a PO?", a: "The PO is marked rejected and the manager is notified to create a revised order." },
  ]
  const [openFaq, setOpenFaq] = React.useState<number | null>(null)

  return (
    <div className="flex flex-col gap-4">
      <ScreenHeader title="Help & Support" />

      <div className="flex flex-col gap-3">
        <Card className="rounded-xl bg-primary/5 shadow-sm">
          <CardContent className="flex items-center gap-4 py-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <MessageSquare className="size-5" />
            </span>
            <div className="flex-1">
              <p className="font-medium">Chat with Support</p>
              <p className="text-xs text-muted-foreground">Avg. response time: 2 minutes</p>
            </div>
            <Button size="sm" onClick={() => toast("Opening support chat...")}>
              Chat
            </Button>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Card
            className="cursor-pointer rounded-xl shadow-sm hover:bg-muted/50 transition-colors"
            onClick={() => toast("Calling support: +91 1800 123 456")}
          >
            <CardContent className="flex flex-col items-center gap-2 py-4 text-center">
              <Phone className="size-5 text-primary" />
              <p className="text-sm font-medium">Call Support</p>
              <p className="text-xs text-muted-foreground">Mon–Sat 9am–6pm</p>
            </CardContent>
          </Card>
          <Card
            className="cursor-pointer rounded-xl shadow-sm hover:bg-muted/50 transition-colors"
            onClick={() => toast("Opening email: support@kosh.app")}
          >
            <CardContent className="flex flex-col items-center gap-2 py-4 text-center">
              <Mail className="size-5 text-primary" />
              <p className="text-sm font-medium">Email Us</p>
              <p className="text-xs text-muted-foreground">support@kosh.app</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div>
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Frequently Asked Questions</p>
        <Card className="rounded-xl shadow-sm">
          <CardContent className="flex flex-col py-1">
            {faqs.map((faq, i) => (
              <React.Fragment key={i}>
                {i > 0 && <Separator />}
                <button
                  className="flex w-full items-start gap-3 py-3 text-left"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full transition-colors text-xs font-bold",
                      openFaq === i ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {openFaq === i ? "−" : "+"}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{faq.q}</p>
                    {openFaq === i && (
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{faq.a}</p>
                    )}
                  </div>
                </button>
              </React.Fragment>
            ))}
          </CardContent>
        </Card>
      </div>

      <Button
        variant="outline"
        className="h-11 w-full rounded-lg"
        onClick={() => toast("Opening documentation...")}
      >
        <ExternalLink data-icon="inline-start" />
        View Documentation
      </Button>
    </div>
  )
}

// ─── Notifications Panel ───────────────────────────────────────────────────

const notifications = [
  {
    id: "n1",
    title: "Critical: Paneer Stock Low",
    body: "Only 1.2 days of Paneer remaining. Consider ordering now.",
    time: "5 min ago",
    read: false,
    type: "critical",
  },
  {
    id: "n2",
    title: "PO #1234 Approved",
    body: "Your purchase order for Chicken (20 kg) has been approved.",
    time: "1 hour ago",
    read: false,
    type: "success",
  },
  {
    id: "n3",
    title: "AI Recommendation",
    body: "Switch your chicken supplier to save ₹200 this week.",
    time: "3 hours ago",
    read: true,
    type: "ai",
  },
  {
    id: "n4",
    title: "Delivery Received",
    body: "Rice delivery (50 kg) from Supplier A has been confirmed.",
    time: "Yesterday",
    read: true,
    type: "success",
  },
  {
    id: "n5",
    title: "High Wastage Alert",
    body: "Butter wastage is 18% above your weekly average.",
    time: "Yesterday",
    read: true,
    type: "warning",
  },
]

const notifStyles: Record<string, { icon: React.ComponentType<{className?: string}>; color: string }> = {
  critical: { icon: AlertCircle, color: "text-destructive bg-destructive/10" },
  success: { icon: Check, color: "text-primary bg-primary/10" },
  ai: { icon: Info, color: "text-accent bg-accent/10" },
  warning: { icon: AlertCircle, color: "text-accent bg-accent/10" },
}

export function NotificationsScreen() {
  const [notifs, setNotifs] = React.useState(notifications)

  function markAllRead() {
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })))
    toast("All notifications marked as read")
  }

  const unreadCount = notifs.filter((n) => !n.read).length

  return (
    <div className="flex flex-col gap-4">
      <ScreenHeader
        title="Notifications"
        right={
          unreadCount > 0 ? (
            <Button variant="ghost" size="sm" onClick={markAllRead}>
              Mark all read
            </Button>
          ) : undefined
        }
      />

      {unreadCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg bg-primary/5 px-3 py-2">
          <Bell className="size-4 text-primary" />
          <p className="text-sm text-primary font-medium">{unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}</p>
        </div>
      )}

      <Card className="rounded-xl shadow-sm">
        <CardContent className="flex flex-col py-1">
          {notifs.map((n, i) => {
            const style = notifStyles[n.type] ?? notifStyles.success
            const IconComp = style.icon
            return (
              <React.Fragment key={n.id}>
                {i > 0 && <Separator />}
                <button
                  className={cn(
                    "flex items-start gap-3 py-3 text-left transition-colors hover:bg-muted/40",
                    !n.read && "bg-primary/[0.03]",
                  )}
                  onClick={() =>
                    setNotifs((prev) =>
                      prev.map((item) => (item.id === n.id ? { ...item, read: true } : item)),
                    )
                  }
                >
                  <span className={cn("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full", style.color)}>
                    <IconComp className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{n.title}</p>
                      {!n.read && <span className="size-2 shrink-0 rounded-full bg-primary" />}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{n.body}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{n.time}</p>
                  </div>
                </button>
              </React.Fragment>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
