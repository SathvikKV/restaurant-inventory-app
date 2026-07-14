"use client"

import * as React from "react"
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Line, LineChart } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { cn } from "@/lib/utils"
import { foodCostTrend, topItemsByUsage, formatCurrency } from "@/lib/kosh-data"
import { ScreenHeader } from "../parts"

export function Reports() {
  const [range, setRange] = React.useState("This Week")
  const ranges = ["This Week", "This Month", "Custom"]

  return (
    <div className="flex flex-col gap-4">
      <ScreenHeader title="Reports & Insights" />

      <div className="flex gap-2">
        {ranges.map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={cn(
              "flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              range === r ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground ring-1 ring-border",
            )}
          >
            {r}
          </button>
        ))}
      </div>

      <Card className="rounded-xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Food Cost Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{ cost: { label: "Food Cost", color: "var(--chart-1)" } }}
            className="h-52 w-full"
          >
            <LineChart data={foodCostTrend} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={44}
                tickFormatter={(v) => `${v / 1000}k`}
              />
              <ChartTooltip
                content={<ChartTooltipContent formatter={(v) => formatCurrency(Number(v))} />}
              />
              <Line type="monotone" dataKey="cost" stroke="var(--color-cost)" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card className="rounded-xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Top Items by Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{ usage: { label: "Usage (kg)", color: "var(--chart-1)" } }}
            className="h-52 w-full"
          >
            <BarChart
              data={topItemsByUsage}
              layout="vertical"
              margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
            >
              <CartesianGrid horizontal={false} strokeDasharray="3 3" />
              <XAxis type="number" tickLine={false} axisLine={false} />
              <YAxis
                type="category"
                dataKey="item"
                tickLine={false}
                axisLine={false}
                width={64}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="usage" fill="var(--color-usage)" radius={6} barSize={22} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}
