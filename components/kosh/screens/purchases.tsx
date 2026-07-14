"use client"

import * as React from "react"
import { Check, X, Truck } from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { purchaseOrders, formatCurrency, type PurchaseOrder } from "@/lib/kosh-data"
import { useKosh } from "../store"

const statusBadge: Record<PurchaseOrder["status"], { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-accent/15 text-accent" },
  approved: { label: "Approved", className: "bg-primary/10 text-primary" },
  rejected: { label: "Rejected", className: "bg-destructive/10 text-destructive" },
  delivered: { label: "Delivered", className: "bg-secondary/25 text-secondary-foreground" },
}

function POCard({
  po,
  onAction,
  role,
  navigate,
}: {
  po: PurchaseOrder
  onAction?: (id: string, action: "approved" | "rejected") => void
  role: string
  navigate: (s: string, p?: Record<string, unknown>) => void
}) {
  return (
    <Card className="rounded-xl shadow-sm">
      <CardContent className="flex flex-col gap-3 py-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-medium">PO #{po.id}</p>
            <p className="text-sm text-muted-foreground">{po.supplier}</p>
          </div>
          <Badge variant="secondary" className={statusBadge[po.status].className}>
            {statusBadge[po.status].label}
          </Badge>
        </div>
        <div className="flex items-center justify-between rounded-lg bg-muted/60 px-3 py-2 text-sm">
          <span className="font-medium">
            {po.item} — {po.quantity} {po.unit}
          </span>
          <span className="font-semibold tabular-nums">{formatCurrency(po.amount)}</span>
        </div>
        <p className="text-xs text-muted-foreground">Date: {po.date}</p>
        {po.status === "pending" && role === "owner" && onAction && (
          <div className="flex gap-3">
            <Button className="flex-1" onClick={() => onAction(po.id, "approved")}>
              <Check data-icon="inline-start" />
              Approve
            </Button>
            <Button
              variant="outline"
              className="flex-1 border-destructive/40 text-destructive hover:bg-destructive/5 hover:text-destructive"
              onClick={() => onAction(po.id, "rejected")}
            >
              <X data-icon="inline-start" />
              Reject
            </Button>
          </div>
        )}
        {po.status === "approved" && role === "manager" && (
          <Button variant="outline" className="w-full" onClick={() => navigate("receive-delivery", { po: po.id })}>
            <Truck data-icon="inline-start" />
            Receive Delivery
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

export function Purchases() {
  const { role, navigate } = useKosh()
  const [orders, setOrders] = React.useState(purchaseOrders)

  function handleAction(id: string, action: "approved" | "rejected") {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: action } : o)))
    toast[action === "approved" ? "success" : "error"](
      `PO #${id} ${action === "approved" ? "approved" : "rejected"}`,
    )
  }

  const pending = orders.filter((o) => o.status === "pending")

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Purchases</h1>
        <Button size="sm" onClick={() => navigate("create-po")}>
          Create PO
        </Button>
      </div>

      <Tabs defaultValue="pending" className="gap-4">
        <TabsList className="w-full">
          <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
          <TabsTrigger value="all">All Orders</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="flex flex-col gap-3">
          {pending.length === 0 ? (
            <Card className="rounded-xl shadow-sm">
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No pending purchase orders.
              </CardContent>
            </Card>
          ) : (
            pending.map((po) => (
              <POCard key={po.id} po={po} onAction={handleAction} role={role} navigate={navigate} />
            ))
          )}
        </TabsContent>

        <TabsContent value="all" className="flex flex-col gap-3">
          {orders.map((po) => (
            <POCard key={po.id} po={po} onAction={handleAction} role={role} navigate={navigate} />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  )
}
