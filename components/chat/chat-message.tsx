"use client"

import type { AnchorHTMLAttributes } from "react"
import ReactMarkdown from "react-markdown"
import { cn } from "@/lib/utils"

export interface ChatMessageProps {
  role: "user" | "assistant"
  content: string
  pending?: boolean
}

// Three-dot indicator shown while an assistant turn is still empty.
function PendingDots(): JSX.Element {
  return (
    <span className="inline-flex items-center gap-1 py-1" aria-label="…">
      <span className="h-2 w-2 rounded-full bg-foreground/40 motion-safe:animate-pulse" />
      <span
        className="h-2 w-2 rounded-full bg-foreground/40 motion-safe:animate-pulse"
        style={{ animationDelay: "150ms" }}
      />
      <span
        className="h-2 w-2 rounded-full bg-foreground/40 motion-safe:animate-pulse"
        style={{ animationDelay: "300ms" }}
      />
    </span>
  )
}

function AssistantBubble({ content, pending }: { content: string; pending?: boolean }): JSX.Element {
  const isEmptyPending = pending === true && content === ""
  return (
    <div className="flex justify-start">
      <div className="max-w-[80%] rounded-2xl rounded-bl-sm bg-muted px-4 py-2 text-sm text-foreground">
        {isEmptyPending ? (
          <PendingDots />
        ) : (
          <div className="prose prose-sm max-w-none break-words dark:prose-invert prose-p:my-1 prose-a:text-[#05b4ba] prose-a:underline">
            <ReactMarkdown
              // No rehype-raw on purpose — disallow raw HTML for safety.
              rehypePlugins={[]}
              components={{
                a: (anchorProps: AnchorHTMLAttributes<HTMLAnchorElement>) => (
                  <a {...anchorProps} target="_blank" rel="noopener noreferrer" />
                ),
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  )
}

function UserBubble({ content }: { content: string }): JSX.Element {
  return (
    <div className="flex justify-end">
      <div
        className={cn(
          "max-w-[80%] rounded-2xl rounded-br-sm px-4 py-2 text-sm text-white",
          "bg-[#05b4ba]",
        )}
      >
        <p className="whitespace-pre-wrap break-words">{content}</p>
      </div>
    </div>
  )
}

export function ChatMessage(props: ChatMessageProps): JSX.Element {
  if (props.role === "user") return <UserBubble content={props.content} />
  return <AssistantBubble content={props.content} pending={props.pending} />
}
