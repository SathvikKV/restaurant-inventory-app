"use client"

import * as React from "react"
import { Mic, Send, Sparkles, ArrowUpRight } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { suggestedChips, aiRecommendations, formatCurrency } from "@/lib/kosh-data"
import { useKosh } from "../store"
import { ScreenHeader } from "../parts"

type Msg = { id: number; from: "bot" | "user"; text: string }

const cannedReply =
  "Based on current stock levels and usage trends, I recommend ordering 20kg paneer and 20kg chicken today. Supplier A offers the best combined price this week."

export function AIAssistant() {
  const [messages, setMessages] = React.useState<Msg[]>([
    { id: 0, from: "bot", text: "Hi Aditya! How can I help you today?" },
  ])
  const [input, setInput] = React.useState("")
  const scrollRef = React.useRef<HTMLDivElement>(null)

  const send = React.useCallback((text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return
    setMessages((prev) => [
      ...prev,
      { id: prev.length, from: "user", text: trimmed },
      { id: prev.length + 1, from: "bot", text: cannedReply },
    ])
    setInput("")
  }, [])

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages])

  return (
    <div className="flex h-full min-h-[70dvh] flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Sparkles className="size-5" />
        </span>
        <h1 className="text-xl font-semibold tracking-tight">AI Assistant</h1>
      </div>

      <div ref={scrollRef} className="flex flex-1 flex-col gap-3 overflow-y-auto pb-2">
        {messages.map((m) => (
          <div key={m.id} className={cn("flex", m.from === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                m.from === "user"
                  ? "rounded-br-sm bg-primary text-primary-foreground"
                  : "rounded-bl-sm bg-card text-card-foreground shadow-sm",
              )}
            >
              {m.text}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {suggestedChips.map((c) => (
            <button
              key={c}
              onClick={() => send(c)}
              className="shrink-0 rounded-full bg-card px-3.5 py-1.5 text-sm text-foreground ring-1 ring-border transition-colors hover:bg-muted"
            >
              {c}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 rounded-full border border-input bg-card px-2 py-1.5">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing && e.keyCode !== 229) send(input)
            }}
            placeholder="Ask anything..."
            className="border-0 bg-transparent px-2 shadow-none focus-visible:ring-0"
          />
          <Button variant="ghost" size="icon-sm" aria-label="Voice input" className="shrink-0">
            <Mic />
          </Button>
          <Button size="icon-sm" aria-label="Send" className="shrink-0 rounded-full" onClick={() => send(input)}>
            <Send />
          </Button>
        </div>
      </div>
    </div>
  )
}

export function AIRecommendationDetail({ id }: { id: string }) {
  const { navigate } = useKosh()
  const rec = aiRecommendations.find((r) => r.id === id) ?? aiRecommendations[0]
  const total = rec.pricePerUnit * rec.quantity

  return (
    <div className="flex flex-col gap-4">
      <ScreenHeader title="AI Recommendation" />

      <Card className="rounded-xl border-0 bg-primary text-primary-foreground shadow-sm">
        <CardContent className="flex flex-col gap-2 py-5">
          <p className="flex items-center gap-2 text-lg font-semibold">
            <Sparkles className="size-5" />
            {rec.title}
          </p>
          <p className="text-sm text-primary-foreground/85 leading-relaxed">{rec.reason}</p>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Best Supplier</p>
        <Card className="rounded-xl shadow-sm">
          <CardContent className="flex flex-col gap-3 py-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">{rec.supplier}</span>
              <span className="font-semibold tabular-nums">
                {formatCurrency(rec.pricePerUnit)}/{rec.unit}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-border pt-3">
              <span className="text-sm text-muted-foreground">
                Est. Total ({rec.quantity} {rec.unit})
              </span>
              <span className="text-lg font-semibold tabular-nums">{formatCurrency(total)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Button
        size="lg"
        className="h-12 w-full rounded-lg text-base"
        onClick={() => navigate("create-po", { item: rec.item, supplier: rec.supplier, quantity: rec.quantity })}
      >
        Create Purchase Order
        <ArrowUpRight data-icon="inline-end" />
      </Button>
    </div>
  )
}
