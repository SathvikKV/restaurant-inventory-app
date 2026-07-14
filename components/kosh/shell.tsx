"use client"

import * as React from "react"
import {
  Home,
  Box,
  ShoppingBag,
  Sparkles,
  MoreHorizontal,
  Plus,
  PanelLeftClose,
  PanelLeft,
  Upload,
  ArrowUpFromLine,
  Trash2,
  Pencil,
  ShoppingCart,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useKosh, type Tab, type Role } from "./store"
import { restaurants } from "@/lib/kosh-data"
import { OwnerHome, ManagerHome } from "./screens/home"
import { OwnerInventory, ManagerInventory } from "./screens/inventory"
import { ItemDetail } from "./screens/item-detail"
import { Purchases } from "./screens/purchases"
import { AIAssistant, AIRecommendationDetail } from "./screens/ai"
import { MoreSettings } from "./screens/more"
import { Reports } from "./screens/reports"
import {
  CreatePO,
  ReceiveDelivery,
  RecordWastage,
  IssueStock,
  AdjustStock,
  UploadInvoice,
  ReviewOCR,
  ReceiveList,
  Corrections,
  History,
} from "./screens/actions"
import {
  RestaurantsScreen,
  UsersScreen,
  AuditLogsScreen,
  IntegrationsScreen,
  SettingsScreen,
  HelpScreen,
  NotificationsScreen,
} from "./screens/settings"

const navItems: { tab: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { tab: "home", label: "Home", icon: Home },
  { tab: "inventory", label: "Inventory", icon: Box },
  { tab: "purchases", label: "Purchases", icon: ShoppingBag },
  { tab: "ai", label: "AI", icon: Sparkles },
  { tab: "more", label: "More", icon: MoreHorizontal },
]

function renderTab(tab: Tab, role: Role) {
  switch (tab) {
    case "home":
      return role === "owner" ? <OwnerHome /> : <ManagerHome />
    case "inventory":
      return role === "owner" ? <OwnerInventory /> : <ManagerInventory />
    case "purchases":
      return <Purchases />
    case "ai":
      return <AIAssistant />
    case "more":
      return <MoreSettings />
  }
}

function renderScreen(screen: string, params: Record<string, unknown> = {}) {
  switch (screen) {
    case "item-detail":
      return <ItemDetail id={String(params.id ?? "")} />
    case "create-po":
      return <CreatePO params={params} />
    case "receive-delivery":
      return <ReceiveDelivery params={params} />
    case "record-wastage":
      return <RecordWastage params={params} />
    case "issue-stock":
      return <IssueStock params={params} />
    case "adjust-stock":
      return <AdjustStock params={params} />
    case "upload-invoice":
      return <UploadInvoice />
    case "review-ocr":
      return <ReviewOCR />
    case "receive-list":
      return <ReceiveList />
    case "corrections":
      return <Corrections />
    case "history":
      return <History params={params} />
    case "reports":
      return <Reports />
    case "ai-recommendation":
      return <AIRecommendationDetail id={String(params.id ?? "")} />
    case "restaurants":
      return <RestaurantsScreen />
    case "users":
      return <UsersScreen />
    case "audit-logs":
      return <AuditLogsScreen />
    case "integrations":
      return <IntegrationsScreen />
    case "settings":
      return <SettingsScreen />
    case "help":
      return <HelpScreen />
    case "notifications":
      return <NotificationsScreen />
    default:
      return <div className="text-muted-foreground">Screen not found: {screen}</div>
  }
}

function RoleSwitcher() {
  const { role, setRole } = useKosh()
  return (
    <Select value={role} onValueChange={(v) => setRole(v as Role)}>
      <SelectTrigger size="sm" className="h-9 w-[132px] bg-card">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value="owner">Owner</SelectItem>
          <SelectItem value="manager">Manager</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

function RestaurantPicker() {
  const { restaurantId, setRestaurantId } = useKosh()
  return (
    <Select value={restaurantId} onValueChange={(v) => v && setRestaurantId(v)}>
      <SelectTrigger size="sm" className="h-9 w-full bg-card">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {restaurants.map((r) => (
            <SelectItem key={r.id} value={r.id}>
              {r.name} — {r.area}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

function QuickActionsSheet() {
  const { quickActionsOpen, setQuickActionsOpen, navigate } = useKosh()
  const actions = [
    { emoji: "📷", label: "Upload Invoice", screen: "upload-invoice", icon: Upload },
    { emoji: "📤", label: "Issue Stock", screen: "issue-stock", icon: ArrowUpFromLine },
    { emoji: "🗑️", label: "Record Wastage", screen: "record-wastage", icon: Trash2 },
    { emoji: "✏️", label: "Adjust Stock", screen: "adjust-stock", icon: Pencil },
    { emoji: "🛒", label: "Create Purchase Order", screen: "create-po", icon: ShoppingCart },
  ]
  return (
    <Sheet open={quickActionsOpen} onOpenChange={setQuickActionsOpen}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Quick Add / Actions</SheetTitle>
        </SheetHeader>
        <div className="grid grid-cols-2 gap-3 px-4 pb-8">
          {actions.map((a) => (
            <button
              key={a.label}
              className="flex flex-col items-start gap-3 rounded-xl border border-border bg-card p-4 text-left shadow-sm transition-colors hover:bg-muted/50"
              onClick={() => {
                setQuickActionsOpen(false)
                navigate(a.screen)
              }}
            >
              <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <a.icon className="size-5" />
              </span>
              <span className="text-sm font-medium leading-tight">{a.label}</span>
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function DesktopSidebar() {
  const { tab, setTab, resetStack } = useKosh()
  const [collapsed, setCollapsed] = React.useState(false)
  return (
    <aside
      className={cn(
        "hidden shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex",
        collapsed ? "w-[76px]" : "w-60",
      )}
    >
      <div className={cn("flex h-16 items-center gap-2 px-4", collapsed && "justify-center px-0")}>
        {!collapsed && <span className="text-2xl font-semibold tracking-tight text-primary">Kosh</span>}
        <Button
          variant="ghost"
          size="icon-sm"
          className={cn(!collapsed && "ml-auto")}
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeft /> : <PanelLeftClose />}
        </Button>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {navItems.map((item) => {
          const active = tab === item.tab
          return (
            <button
              key={item.tab}
              onClick={() => {
                resetStack()
                setTab(item.tab)
              }}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                collapsed && "justify-center px-0",
              )}
              aria-current={active ? "page" : undefined}
            >
              <item.icon className="size-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </button>
          )
        })}
      </nav>
      {!collapsed && (
        <div className="border-t border-sidebar-border p-4">
          <p className="text-xs text-muted-foreground">Signed in as</p>
          <p className="truncate text-sm font-medium">{restaurants[0].name}</p>
        </div>
      )}
    </aside>
  )
}

function BottomNav() {
  const { tab, setTab, resetStack, setQuickActionsOpen } = useKosh()
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-[430px] items-center justify-around px-2 py-1.5">
        {navItems.map((item) => {
          const active = tab === item.tab
          return (
            <button
              key={item.tab}
              onClick={() => {
                resetStack()
                setTab(item.tab)
              }}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 rounded-lg py-1.5 text-[11px] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground",
              )}
              aria-current={active ? "page" : undefined}
            >
              <item.icon className="size-5" />
              {item.label}
            </button>
          )
        })}
      </div>
      <button
        onClick={() => setQuickActionsOpen(true)}
        aria-label="Quick actions"
        className="absolute -top-6 right-4 flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"
      >
        <Plus className="size-6" />
      </button>
    </nav>
  )
}

export function AppShell() {
  const { tab, role, stack, setQuickActionsOpen } = useKosh()
  const current = stack[stack.length - 1]

  return (
    <div className="flex min-h-dvh bg-background">
      <DesktopSidebar />
      <div className="flex min-h-dvh flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur lg:px-6">
          <span className="text-2xl font-semibold tracking-tight text-primary lg:hidden">Kosh</span>
          <div className="ml-auto flex items-center gap-2">
            <div className="hidden w-64 sm:block">
              <RestaurantPicker />
            </div>
            <RoleSwitcher />
            <Button
              size="sm"
              className="hidden rounded-lg lg:inline-flex"
              onClick={() => setQuickActionsOpen(true)}
            >
              <Plus className="size-4" data-icon="inline-start" />
              Quick Add
            </Button>
          </div>
        </header>

        {/* Main content */}
        <main className="mx-auto w-full max-w-[430px] flex-1 px-4 pb-28 pt-5 lg:max-w-5xl lg:px-6 lg:pb-10">
          {current ? renderScreen(current.screen, current.params) : renderTab(tab, role)}
        </main>
      </div>
      <BottomNav />
      <QuickActionsSheet />
    </div>
  )
}
