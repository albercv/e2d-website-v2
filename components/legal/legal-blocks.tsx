import type { LegalBlock, LegalListItem } from "@/lib/legal/types"
import { RichTextView } from "./rich-text"

const PARAGRAPH_CLASS = "text-muted-foreground leading-relaxed"
const LIST_CLASS = "list-disc pl-6 space-y-2 text-muted-foreground"

function ParagraphBlock({ block }: { block: Extract<LegalBlock, { kind: "paragraph" }> }) {
  return (
    <p className={PARAGRAPH_CLASS}>
      <RichTextView value={block.text} />
    </p>
  )
}

function LinesBlock({ block }: { block: Extract<LegalBlock, { kind: "lines" }> }) {
  return (
    <p className={PARAGRAPH_CLASS}>
      {block.lines.map((line, index) => (
        <span key={index}>
          {index > 0 && <br />}
          <RichTextView value={line} />
        </span>
      ))}
    </p>
  )
}

function ListItemView({ item }: { item: LegalListItem }) {
  return (
    <li id={item.id}>
      {item.label && <strong>{item.label}</strong>}
      {item.label && " "}
      <RichTextView value={item.text} />
    </li>
  )
}

function ListBlock({ block }: { block: Extract<LegalBlock, { kind: "list" }> }) {
  return (
    <ul className={LIST_CLASS}>
      {block.items.map((item, index) => (
        <ListItemView key={item.id ?? index} item={item} />
      ))}
    </ul>
  )
}

function CardsBlock({ block }: { block: Extract<LegalBlock, { kind: "cards" }> }) {
  return (
    <div className="space-y-4">
      {block.items.map((item, index) => (
        <div key={index} className="border border-border rounded-lg p-4">
          <h3 className="font-semibold mb-2">{item.title}</h3>
          <p className="text-sm text-muted-foreground">
            <RichTextView value={item.text} />
          </p>
        </div>
      ))}
    </div>
  )
}

function InfoBoxBlock({ block }: { block: Extract<LegalBlock, { kind: "infoBox" }> }) {
  return (
    <div className="p-4 bg-muted rounded-lg">
      {block.rows.map((row, index) => (
        <p key={index}>
          <strong>{row.label}:</strong> <RichTextView value={row.value} />
        </p>
      ))}
    </div>
  )
}

function TableBlock({ block }: { block: Extract<LegalBlock, { kind: "table" }> }) {
  const mobileLabels = block.columns.slice(1)

  return (
    <div className="not-prose">
      <table className="w-full text-sm text-left border-collapse">
        <thead className="hidden md:table-header-group">
          <tr className="border-b border-border">
            {block.columns.map((column, index) => (
              <th
                key={column}
                scope="col"
                className={index === block.columns.length - 1 ? "py-2 font-semibold" : "py-2 pr-4 font-semibold"}
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row) => (
            <tr key={row.header} className="block md:table-row border-b border-border py-3 md:py-0">
              <th scope="row" className="block md:table-cell py-1 md:py-3 pr-4 font-semibold align-top">
                {row.header}
              </th>
              {row.cells.map((cell, cellIndex) => {
                const isLast = cellIndex === row.cells.length - 1
                return (
                  <td
                    key={cellIndex}
                    className={`block md:table-cell py-1 md:py-3 ${isLast ? "" : "pr-4"} text-muted-foreground align-top`}
                  >
                    <span className="md:hidden font-medium text-foreground">{mobileLabels[cellIndex]}: </span>
                    {cell}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Dispatches one `LegalBlock` to its renderer. Callers space siblings with a `space-y-*` wrapper. */
export function BlockView({ block }: { block: LegalBlock }) {
  switch (block.kind) {
    case "paragraph":
      return <ParagraphBlock block={block} />
    case "lines":
      return <LinesBlock block={block} />
    case "list":
      return <ListBlock block={block} />
    case "cards":
      return <CardsBlock block={block} />
    case "infoBox":
      return <InfoBoxBlock block={block} />
    case "table":
      return <TableBlock block={block} />
  }
}
