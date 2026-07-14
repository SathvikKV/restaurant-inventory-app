"use client"

import * as React from "react"
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Pencil,
  Trash2,
  ChevronRight,
} from "lucide-react"
import { Line, LineChart, XAxis, CartesianGrid } from "recharts"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { inventory, formatCurrency } from "@/lib/kosh-data"
import { useKosh } from "../store"
import { ScreenHeader } from "../parts"

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="rounded-xl shadow-sm">
      <CardContent className="flex flex-col gap-1 py-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold tracking-tight">{value}</p>
      </CardContent>
    </Card>
  )
}

function PriceChart({ data }: { data: { day: string; price: number }[] }) {
  return (
    <ChartContainer
      config={{ price: { label: "Price", color: "var(--chart-1)" } }}
      className="h-40 w-full"
    >
      <LineChart data={data} margin={{ top: 8, right: 12, left: 12, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Line type="monotone" dataKey="price" stroke="var(--color-price)" strokeWidth={2} dot={false} />
      </LineChart>
    </ChartContainer>
  )
}

export function ItemDetail({ id }: { id: string }) {
  const { role, navigate } = useKosh()
  const item = inventory.find((i) => i.id === id) ?? inventory.find((i) => i.name.toLowerCase() === id) ?? inventory[1]
  const [showHistory, setShowHistory] = React.useState(false)

  const tabList =
    role === "owner"
      ? ["Overview", "Consumption", "Purchases"]
      : ["Overview", "Transactions", "Adjustments"]

  return (
    <div className="flex flex-col gap-4">
      <ScreenHeader title={item.name} subtitle={`${item.category} · ${item.quantity} ${item.unit} in stock`} />

      <Tabs defaultValue="Overview" className="gap-4">
        <TabsList className="w-full">
          {tabList.map((t) => (
            <TabsTrigger key={t} value={t}>
              {t}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="Overview" className="flex flex-col gap-4">
          <Card className="rounded-xl shadow-sm">
            <CardContent className="flex flex-col gap-1 py-4">
              <p className="text-sm text-muted-foreground">Current Stock</p>
              <p className="text-3xl font-semibold tracking-tight">
                {item.quantity} {item.unit}
              </p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <StatCard label="Avg Daily Usage" value={`${item.avgDaily} ${item.unit}`} />
            <StatCard label="This Week Usage" value={`${item.weekUsage} ${item.unit}`} />
          </div>

          {role === "owner" ? (
            <>
              <Card className="rounded-xl shadow-sm">
                <CardContent className="flex items-center justify-between py-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Suggested Purchase</p>
                    <p className="text-2xl font-semibold tracking-tight">
                      {item.suggestedPurchase || item.avgDaily * 2} {item.unit}
                    </p>
                  </div>
                  <Button onClick={() => navigate("create-po", { item: item.name })}>Create Purchase</Button>
                </CardContent>
              </Card>

              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Supplier Prices</p>
                <Card className="rounded-xl shadow-sm">
                  <CardContent className="flex flex-col py-1">
                    {item.suppliers.map((s, i) => (
                      <React.Fragment key={s.name}>
                        {i > 0 && <Separator />}
                        <div className="flex items-center justify-between py-3">
                          <span className="flex items-center gap-2">
                            <span className="font-medium">{s.name}</span>
                            {s.best && (
                              <Badge className="bg-primary/10 text-primary" variant="secondary">
                                Best Price
                              </Badge>
                            )}
                          </span>
                          <span className="font-medium tabular-nums">{formatCurrency(s.price)}</span>
                        </div>
                      </React.Fragment>
                    ))}
                  </CardContent>
                </Card>
              </div>

              {showHistory && (
                <Card className="rounded-xl shadow-sm">
                  <CardContent className="py-4">
                    <p className="mb-2 text-sm text-muted-foreground">Price history (last 7 days)</p>
                    <PriceChart data={item.priceHistory} />
                  </CardContent>
                </Card>
              )}
              <Button variant="outline" className="w-full" onClick={() => setShowHistory((s) => !s)}>
                {showHistory ? "Hide Price History" : "View Price History"}
              </Button>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Actions</p>
                <Card className="rounded-xl shadow-sm">
                  <CardContent className="flex flex-col py-1">
                    {[
                      { icon: ArrowDownToLine, label: "Receive Stock", screen: "receive-delivery" },
                      { icon: ArrowUpFromLine, label: "Issue Stock", screen: "issue-stock" },
                      { icon: Pencil, label: "Adjust Stock", screen: "adjust-stock" },
                      { icon: Trash2, label: "Record Wastage", screen: "record-wastage" },
                    ].map((a, i) => (
                      <React.Fragment key={a.label}>
                        {i > 0 && <Separator />}
                        <button
                          className="flex items-center gap-3 py-3 text-left"
                          onClick={() => navigate(a.screen, { item: item.name })}
                        >
                          <a.icon className="size-5 text-primary" />
                          <span className="flex-1 font-medium">{a.label}</span>
                          <ChevronRight className="size-4 text-muted-foreground" />
                        </button>
                      </React.Fragment>
                    ))}
                  </CardContent>
                </Card>
              </div>
              <Button variant="outline" className="w-full" onClick={() => navigate("history", { item: item.name })}>
                View History
              </Button>
            </>
          )}
        </TabsContent>

        <TabsContent value="Consumption" className="flex flex-col gap-3">
          <Card className="rounded-xl shadow-sm">
            <CardContent className="py-4">
              <p className="mb-2 text-sm text-muted-foreground">Daily consumption (last 7 days)</p>
              <PriceChart data={item.priceHistory.map((p, i) => ({ day: p.day, price: item.avgDaily + (i % 3) }))} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="Transactions" className="flex flex-col gap-3">
          <TxnList item={item.name} unit={item.unit} kind="txn" />
        </TabsContent>

        <TabsContent value="Purchases" className="flex flex-col gap-3">
          <TxnList item={item.name} unit={item.unit} kind="purchase" />
        </TabsContent>

        <TabsContent value="Adjustments" className="flex flex-col gap-3">
          <TxnList item={item.name} unit={item.unit} kind="adjust" />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function TxnList({ item, unit, kind }: { item: string; unit: string; kind: "txn" | "purchase" | "adjust" }) {
  const rows =
    kind === "purchase"
      ? [
          { label: "Received from Supplier A", qty: `+20 ${unit}`, date: "Today", tone: "text-primary" },
          { label: "Received from Supplier B", qty: `+15 ${unit}`, date: "3 May 2024", tone: "text-primary" },
        ]
      : kind === "adjust"
        ? [
            { label: "Stock count correction", qty: `-1.5 ${unit}`, date: "Yesterday", tone: "text-destructive" },
            { label: "Recount adjustment", qty: `+0.5 ${unit}`, date: "2 May 2024", tone: "text-primary" },
          ]
        : [
            { label: "Issued to Kitchen", qty: `-9 ${unit}`, date: "Today", tone: "text-destructive" },
            { label: "Received from Supplier A", qty: `+20 ${unit}`, date: "Today", tone: "text-primary" },
            { label: "Wastage — Spoiled", qty: `-0.5 ${unit}`, date: "Yesterday", tone: "text-destructive" },
          ]
  return (
    <Card className="rounded-xl shadow-sm">
      <CardContent className="flex flex-col py-1">
        {rows.map((r, i) => (
          <React.Fragment key={i}>
            {i > 0 && <Separator />}
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium">{r.label}</p>
                <p className="text-xs text-muted-foreground">{r.date}</p>
              </div>
              <span className={`text-sm font-semibold tabular-nums ${r.tone}`}>{r.qty}</span>
            </div>
          </React.Fragment>
        ))}
      </CardContent>
    </Card>
  )
}
