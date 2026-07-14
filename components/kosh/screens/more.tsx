"use client"

import {
  Store,
  Users,
  BarChart3,
  Sparkles,
  ScrollText,
  Plug,
  Settings,
  LifeBuoy,
  LogOut,
  ChevronRight,
} from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { restaurants } from "@/lib/kosh-data"
import { useKosh } from "../store"

export function MoreSettings() {
  const { navigate, logout, restaurantId, role } = useKosh()
  const restaurant = restaurants.find((r) => r.id === restaurantId) ?? restaurants[0]

  const items = [
    { icon: Store, label: "Restaurants", onClick: () => navigate("restaurants") },
    { icon: Users, label: "Users & Roles", onClick: () => navigate("users") },
    { icon: BarChart3, label: "Reports", onClick: () => navigate("reports") },
    { icon: Sparkles, label: "AI Reports", onClick: () => navigate("reports") },
    { icon: ScrollText, label: "Audit Logs", onClick: () => navigate("audit-logs") },
    { icon: Plug, label: "Integrations", onClick: () => navigate("integrations") },
    { icon: Settings, label: "Settings", onClick: () => navigate("settings") },
    { icon: LifeBuoy, label: "Help & Support", onClick: () => navigate("help") },
  ]

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold tracking-tight">More</h1>

      <Card className="rounded-xl shadow-sm">
        <CardContent className="flex items-center gap-3 py-4">
          <span className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Store className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">
              {restaurant.name}, {restaurant.area}
            </p>
            <p className="text-sm capitalize text-muted-foreground">Signed in as {role}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl shadow-sm">
        <CardContent className="flex flex-col py-1">
          {items.map((it, i) => (
            <div key={it.label}>
              {i > 0 && <Separator />}
              <button className="flex w-full items-center gap-3 py-3 text-left" onClick={it.onClick}>
                <it.icon className="size-5 text-muted-foreground" />
                <span className="flex-1 font-medium">{it.label}</span>
                <ChevronRight className="size-4 text-muted-foreground" />
              </button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="rounded-xl shadow-sm">
        <CardContent className="py-1">
          <button
            className="flex w-full items-center gap-3 py-3 text-left text-destructive"
            onClick={() => {
              toast("Logged out")
              logout()
            }}
          >
            <LogOut className="size-5" />
            <span className="flex-1 font-medium">Logout</span>
          </button>
        </CardContent>
      </Card>
    </div>
  )
}
