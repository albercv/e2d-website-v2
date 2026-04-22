"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"

type BudgetWebhookResponse = {
  ok: boolean
  timestamp: string
  durationMs: number
  upstream: {
    url: string
    status: number
    ok: boolean
    contentType: string | null
    data: unknown
  }
}

function safePretty(value: unknown) {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

function extractOutputText(value: unknown): string | null {
  const outputs: string[] = []

  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === "object" && item !== null) {
        const output = (item as Record<string, unknown>).output
        if (typeof output === "string" && output.trim().length > 0) outputs.push(output)
      }
    }
  } else if (typeof value === "object" && value !== null) {
    const output = (value as Record<string, unknown>).output
    if (typeof output === "string" && output.trim().length > 0) outputs.push(output)
  }

  if (outputs.length === 0) return null
  return outputs.join("\n\n---\n\n")
}

export function BudgetWebhookForm() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [company, setCompany] = useState("")
  const [budget, setBudget] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [response, setResponse] = useState<BudgetWebhookResponse | null>(null)

  const outputText = useMemo(() => extractOutputText(response?.upstream.data), [response])

  const payload = useMemo(
    () => ({
      name,
      email,
      phone,
      company,
      budget,
      message,
    }),
    [name, email, phone, company, budget, message],
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResponse(null)
    try {
      const res = await fetch("/api/auth/budget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data: unknown = await res.json().catch(() => null)
      if (!res.ok) {
        const obj = typeof data === "object" && data !== null ? (data as Record<string, unknown>) : {}
        const msg =
          (typeof obj.error === "string" && obj.error) ||
          (typeof obj.message === "string" && obj.message) ||
          "Error llamando al webhook"
        throw new Error(msg)
      }
      setResponse(data as BudgetWebhookResponse)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "No se pudo completar la llamada"
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="border rounded-lg p-4 bg-card space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground" htmlFor="budget-name">
              Nombre
            </label>
            <Input id="budget-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground" htmlFor="budget-email">
              Email
            </label>
            <Input
              id="budget-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground" htmlFor="budget-phone">
              Teléfono (opcional)
            </label>
            <Input id="budget-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground" htmlFor="budget-company">
              Empresa (opcional)
            </label>
            <Input id="budget-company" value={company} onChange={(e) => setCompany(e.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm text-muted-foreground" htmlFor="budget-range">
              Rango de presupuesto (opcional)
            </label>
            <Input
              id="budget-range"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="Ej: 1000–3000€"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm text-muted-foreground" htmlFor="budget-message">
              Mensaje
            </label>
            <Textarea
              id="budget-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              rows={6}
            />
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex items-center gap-2">
          <Button type="submit" disabled={loading}>
            {loading ? "Enviando..." : "Llamar webhook"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={() => {
              setName("")
              setEmail("")
              setPhone("")
              setCompany("")
              setBudget("")
              setMessage("")
              setError(null)
              setResponse(null)
            }}
          >
            Limpiar
          </Button>
        </div>
      </form>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="text-sm font-medium">Respuesta</h2>
          {response && (
            <span className="text-xs text-muted-foreground">
              HTTP upstream: {response.upstream.status} · {response.durationMs} ms
            </span>
          )}
        </div>
        {response && outputText ? (
          <Tabs defaultValue="json">
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="json">JSON</TabsTrigger>
              <TabsTrigger value="text">Texto</TabsTrigger>
            </TabsList>
            <TabsContent value="json">
              <pre className="text-xs bg-muted/40 border rounded-md p-3 overflow-auto max-h-[420px]">
                {safePretty(response)}
              </pre>
            </TabsContent>
            <TabsContent value="text">
              <pre className="text-xs bg-muted/40 border rounded-md p-3 overflow-auto max-h-[420px] whitespace-pre-wrap break-words">
                {outputText}
              </pre>
            </TabsContent>
          </Tabs>
        ) : (
          <pre className="text-xs bg-muted/40 border rounded-md p-3 overflow-auto max-h-[420px]">
            {response ? safePretty(response) : "Aún no hay respuesta."}
          </pre>
        )}
      </div>
    </div>
  )
}
