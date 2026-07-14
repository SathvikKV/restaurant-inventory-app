"use client"

import { KoshProvider, useKosh } from "./store"
import { Landing, AuthFlow } from "./auth"
import { AppShell } from "./shell"

function Router() {
  const { stage } = useKosh()
  if (stage === "landing") return <Landing />
  if (stage === "auth") return <AuthFlow />
  return <AppShell />
}

export function KoshApp() {
  return (
    <KoshProvider>
      <Router />
    </KoshProvider>
  )
}
