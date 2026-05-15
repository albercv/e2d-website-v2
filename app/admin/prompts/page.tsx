/**
 * Admin: editable system prompt — per-locale dashboard.
 *
 * Server component. Lists the three supported locales (es/en/it) and
 * shows the active version, total versions, and last update for each.
 * Locales without any DB version are still listed so editors can seed
 * them from the per-locale page (where the hardcoded fallback is shown).
 *
 * Auth: inherited from the global `admin_session` middleware that guards
 * everything under `/admin`.
 */

import Link from "next/link"

import {
  summarizeByLocale,
  type LocaleSummary,
} from "@/lib/chat/prompt-store"
import type { Locale } from "@/lib/chat/types"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export const dynamic = "force-dynamic"

const LOCALES: readonly Locale[] = ["es", "en", "it"]

interface Row {
  locale: Locale
  activeVersion: number | null
  lastUpdated: string | null
  totalVersions: number
}

function mergeRows(summaries: LocaleSummary[]): Row[] {
  const byLocale = new Map<Locale, LocaleSummary>()
  for (const s of summaries) byLocale.set(s.locale, s)
  return LOCALES.map((locale) => {
    const found = byLocale.get(locale)
    return {
      locale,
      activeVersion: found?.activeVersion ?? null,
      lastUpdated: found?.lastUpdated ?? null,
      totalVersions: found?.totalVersions ?? 0,
    }
  })
}

function formatDate(value: string | null): string {
  if (!value) return "—"
  return value.replace("T", " ").slice(0, 19)
}

async function loadRows(): Promise<{ rows: Row[]; error: string | null }> {
  try {
    const summaries = await summarizeByLocale()
    return { rows: mergeRows(summaries), error: null }
  } catch (err) {
    return {
      rows: mergeRows([]),
      error: (err as Error).message,
    }
  }
}

function LocaleRow({ row }: { row: Row }): JSX.Element {
  return (
    <tr className="border-b last:border-0 hover:bg-muted/40">
      <td className="px-3 py-2">
        <Badge variant="outline">{row.locale}</Badge>
      </td>
      <td className="px-3 py-2 tabular-nums">
        {row.activeVersion === null ? (
          <span className="text-muted-foreground">— (fallback)</span>
        ) : (
          <Badge>{`v${row.activeVersion}`}</Badge>
        )}
      </td>
      <td className="px-3 py-2 text-right tabular-nums">{row.totalVersions}</td>
      <td className="px-3 py-2 text-xs text-muted-foreground">
        {formatDate(row.lastUpdated)}
      </td>
      <td className="px-3 py-2">
        <Link
          href={`/admin/prompts/${row.locale}`}
          className="underline text-sm"
        >
          Editar →
        </Link>
      </td>
    </tr>
  )
}

export default async function AdminPromptsPage(): Promise<JSX.Element> {
  const { rows, error } = await loadRows()
  return (
    <div className="container mx-auto py-6 max-w-4xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>System prompts</CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-sm text-destructive mb-3">
              No se pudo leer la base de datos: {error}. Mostrando estado
              vacío; el chat sigue funcionando con el fallback hardcodeado.
            </p>
          ) : null}
          <p className="text-sm text-muted-foreground mb-4">
            Cada locale tiene su propio prompt versionado. La columna Versión
            activa indica qué body se sirve en runtime; si no hay ninguna
            versión activa el chat usa el fallback hardcodeado en
            <code className="mx-1">lib/chat/prompt.ts</code>.
          </p>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">Locale</th>
                  <th className="px-3 py-2 font-medium">Versión activa</th>
                  <th className="px-3 py-2 font-medium text-right">
                    Versiones
                  </th>
                  <th className="px-3 py-2 font-medium">Última actualización</th>
                  <th className="px-3 py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <LocaleRow key={row.locale} row={row} />
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
