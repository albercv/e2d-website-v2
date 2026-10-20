import type { ReactNode } from "react"
import type { ShowcaseProject } from "@/lib/showcase/projects"
import { EvidenceLabel } from "./evidence-label"
import { InfoCard, TextLink } from "./page-primitives"

interface ProjectCardProps {
  project: ShowcaseProject
  /** Replaces the default summary when a page needs to stress another aspect. */
  summary?: ReactNode
}

export function ProjectCard({ project, summary }: ProjectCardProps) {
  return (
    <InfoCard title={project.name} label={<EvidenceLabel kind={project.evidence} />}>
      <p>{summary ?? project.summary}</p>
      {(project.url || project.postPath) && (
        <p className="flex flex-wrap gap-x-4 gap-y-1">
          {project.url && (
            <TextLink href={project.url} external>
              {project.domain ?? project.url}
            </TextLink>
          )}
          {project.postPath && (
            <TextLink href={project.postPath}>{project.postLinkText ?? "Leer el artículo"}</TextLink>
          )}
        </p>
      )}
    </InfoCard>
  )
}
