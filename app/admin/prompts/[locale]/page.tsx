/**
 * Admin: per-locale prompt editor.
 *
 * Server component. Loads the version history for the locale, surfaces a
 * textarea seeded with the active body (or the hardcoded fallback when
 * there is no DB version yet) and exposes "save new version" + "activate
 * version" via Server Actions. The PreviewIsland renders the assembled
 * prompt against sample chunks without persisting.
 *
 * Auth: inherited from the global `admin_session` middleware that guards
 * everything under `/admin`.
 */

import { notFound } from "next/navigation"
import { revalidatePath } from "next/cache"
import Link from "next/link"

import {
  activateVersion,
  createVersion,
  invalidatePromptCache,
  listVersions,
  type PromptVersion,
} from "@/lib/chat/prompt-store"
import { getFallbackPromptBody } from "@/lib/chat/prompt"
import type { Locale } from "@/lib/chat/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

import PreviewIsland from "../preview-island"

export const dynamic = "force-dynamic"

const LOCALES: readonly Locale[] = ["es", "en", "it"]

function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value)
}

function formatDate(value: string | null): string {
  if (!value) return "—"
  return value.replace("T", " ").slice(0, 19)
}

interface LoadedState {
  versions: PromptVersion[]
  active: PromptVersion | null
  error: string | null
}

async function loadState(locale: Locale): Promise<LoadedState> {
  try {
    const versions = await listVersions(locale)
    const active = versions.find((v) => v.isActive) ?? null
    return { versions, active, error: null }
  } catch (err) {
    return { versions: [], active: null, error: (err as Error).message }
  }
}

async function saveAction(locale: Locale, formData: FormData): Promise<void> {
  "use server"
  const body = String(formData.get("body") ?? "").trim()
  const notes = String(formData.get("notes") ?? "").trim()
  if (body.length === 0) return
  await createVersion(locale, body, notes.length > 0 ? notes : undefined)
  invalidatePromptCache(locale)
  revalidatePath(`/admin/prompts/${locale}`)
}

async function activateAction(locale: Locale, formData: FormData): Promise<void> {
  "use server"
  const raw = String(formData.get("version") ?? "")
  const version = Number.parseInt(raw, 10)
  if (!Number.isFinite(version) || version <= 0) return
  await activateVersion(locale, version)
  revalidatePath(`/admin/prompts/${locale}`)
}

function ActiveBadge({ active }: { active: PromptVersion | null }): JSX.Element {
  if (!active) {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        sin versión activa (fallback)
      </Badge>
    )
  }
  return <Badge>{`v${active.version} activa`}</Badge>
}

interface HistoryRowProps {
  locale: Locale
  version: PromptVersion
  activate: (formData: FormData) => Promise<void>
}

function HistoryRow({ locale, version, activate }: HistoryRowProps): JSX.Element {
  return (
    <tr className="border-b last:border-0 align-top">
      <td className="px-3 py-2 tabular-nums font-mono text-xs">
        v{version.version}
      </td>
      <td className="px-3 py-2 text-xs text-muted-foreground">
        {formatDate(version.createdAt)}
      </td>
      <td className="px-3 py-2 text-xs">
        {version.notes ? (
          <span>{version.notes}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-3 py-2">
        {version.isActive ? (
          <Badge>activa</Badge>
        ) : (
          <form action={activate}>
            <input type="hidden" name="version" value={version.version} />
            <Button type="submit" size="sm" variant="outline">
              Activar
            </Button>
          </form>
        )}
      </td>
      <td className="px-3 py-2">
        <details>
          <summary className="cursor-pointer text-xs underline">Ver body</summary>
          <pre className="mt-2 whitespace-pre-wrap rounded-md bg-muted p-2 text-xs max-h-64 overflow-auto">
            {version.body}
          </pre>
        </details>
      </td>
    </tr>
  )
}

interface HistoryTableProps {
  locale: Locale
  versions: PromptVersion[]
  activate: (formData: FormData) => Promise<void>
}

function HistoryTable({ locale, versions, activate }: HistoryTableProps): JSX.Element {
  if (versions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aún no hay versiones guardadas. Edita el body y pulsa Guardar para
        crear la primera; el chat seguirá usando el fallback hasta que
        actives una versión.
      </p>
    )
  }
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left">
          <tr>
            <th className="px-3 py-2 font-medium">Versión</th>
            <th className="px-3 py-2 font-medium">Creada</th>
            <th className="px-3 py-2 font-medium">Notas</th>
            <th className="px-3 py-2 font-medium">Estado</th>
            <th className="px-3 py-2 font-medium">Body</th>
          </tr>
        </thead>
        <tbody>
          {versions.map((v) => (
            <HistoryRow key={v.id} locale={locale} version={v} activate={activate} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default async function AdminPromptLocalePage({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<JSX.Element> {
  const { locale: raw } = await params
  if (!isLocale(raw)) notFound()
  const locale: Locale = raw

  const { versions, active, error } = await loadState(locale)
  const seedBody = active?.body ?? getFallbackPromptBody(locale)

  const save = saveAction.bind(null, locale)
  const activate = activateAction.bind(null, locale)

  return (
    <div className="container mx-auto py-6 max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/prompts" className="text-sm underline">
          ← Volver
        </Link>
        <Badge variant="outline">{locale}</Badge>
        <ActiveBadge active={active} />
      </div>

      {error ? (
        <p className="text-sm text-destructive">
          Error leyendo la base de datos: {error}. El chat sigue funcionando
          con el fallback hardcodeado.
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Crear nueva versión</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={save} className="grid gap-3">
            <div className="grid gap-2">
              <Label htmlFor="body">Body del prompt</Label>
              <Textarea
                id="body"
                name="body"
                defaultValue={seedBody}
                className="min-h-72 font-mono text-xs"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Notas (opcional)</Label>
              <input
                id="notes"
                name="notes"
                maxLength={500}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                placeholder="Ej: refuerzo del posicionamiento de software a medida"
              />
            </div>
            <div className="flex items-center gap-3">
              <Button type="submit" size="sm">
                Guardar como nueva versión
              </Button>
              <span className="text-xs text-muted-foreground">
                Guardar no activa la versión: úsala primero en preview, luego
                pulsa Activar en la lista de abajo.
              </span>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Previsualizar</CardTitle>
        </CardHeader>
        <CardContent>
          <PreviewIsland locale={locale} initialBody={seedBody} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial</CardTitle>
        </CardHeader>
        <CardContent>
          <HistoryTable locale={locale} versions={versions} activate={activate} />
        </CardContent>
      </Card>
    </div>
  )
}
