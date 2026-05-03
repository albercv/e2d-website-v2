# Tarea Activa

## Blog Connector — Claude.ai web → MCP → blog (multi-idioma)

**Rama:** `feature/blogConnector`
**Spec:** `docs/superpowers/specs/2026-05-02-blog-connector-design.md` (commit `e759edb`)
**Plan:** `docs/superpowers/plans/2026-05-02-blog-connector.md` (commit `a6c2578`)

### Estado: PLAN ESCRITO Y APROBADO — pendiente de ejecutar.

Última decisión (2026-05-02): elegida ejecución **Subagent-Driven** (`superpowers:subagent-driven-development`). No se ha despachado ningún subagent todavía. Pausa pedida por el usuario antes del Task A1.

### Cómo continuar en una sesión futura

1. Leer este fichero + el plan en `docs/superpowers/plans/2026-05-02-blog-connector.md`.
2. Confirmar con el usuario si sigue queriendo ejecución subagent-driven o cambia a inline.
3. Decidir worktree sí/no (sigue en el directorio principal por ahora).
4. Despachar implementer subagent para **Task A1** (tests para `skip_rebuild` en `posts.create`).
5. Tras cada task: spec-reviewer + code-quality-reviewer antes de pasar al siguiente.

### Tasks de código (8) — las hace el driver con subagents

- [ ] A1 — Tests para `skip_rebuild`
- [ ] A2 — Implementar `skip_rebuild` en posts.create
- [ ] A3 — Declarar `skip_rebuild` en el manifest
- [ ] B1 — Tests para `posts.rebuild`
- [ ] B2 — Implementar `posts.rebuild` route handler
- [ ] B3 — Registrar `posts.rebuild` en el manifest
- [ ] B4 — Tests del manifest
- [ ] C2 — Actualizar documentación MCP

### Tasks manuales (5) — las hace Alberto

- [ ] C1 — Configurar `.env` en el servidor (`AUTO_REBUILD_AFTER_MCP_CHANGE=true`, `ADMIN_REBUILD_URL`, `RESTART_COMMAND`)
- [ ] D1 — Sanity check de infraestructura en producción (curl + manifest público)
- [ ] D2 — OAuth manual E2E con curl (aísla backend antes de tocar Claude.ai)
- [ ] D3 — Smoke test desde Claude.ai web (Custom Connector)
- [ ] D4 — Verificación de fallo controlado (409 colisión)

### Cambios sin commitear (preexistentes, no relacionados con el plan)

```
M docs/mcp-changelog.md
M docs/mcp-examples.md
M docs/mcp-usage.md
M public/build-report-advanced.json
```

Estos venían de antes. Decisión tomada en el plan: la Task C2 los integra junto con las entradas nuevas de `posts.rebuild` y `skip_rebuild`. **No tocarlos antes de C2.**
