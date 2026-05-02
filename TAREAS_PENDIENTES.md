# Backlog — E2D Website

## 🔴 Crítico

- [ ] Reimplementar chat: reemplazar proxy a n8n por servicio propio
- [ ] Reimplementar webhook de presupuesto: reemplazar llamada a api.evolve2digital.com por lógica propia
- [ ] Reimplementar agent.query: reemplazar delegación a webhook externo por agente propio
- [ ] Configurar Nginx en Hostinger como reverse proxy para PM2
- [ ] Cambiar registro A en Cloudflare: IP GCP → IP VPS Hostinger
- [ ] Verificar build completo en Hostinger antes de cambiar DNS

## 🟡 Importante

- [ ] Hacer backup de data/oauth.sqlite antes de cualquier migración
- [ ] Confirmar variables de entorno completas en Hostinger .env
- [ ] Configurar pm2 startup en Hostinger para arranque automático
- [ ] Revisar por qué auth/ y checkout_sessions/ no están en rama develop

## 🟢 Mejora

- [ ] Resolver discrepancia de dominio: evolve2digital.com vs e2d.es en build-ai-indexing-advanced.js
- [ ] Evaluar si checkout (Map en memoria) necesita persistencia real antes de launch
- [ ] Configurar cron jobs equivalentes a los de vercel.json
- [ ] Reactivar DNSSEC tras estabilizar migración a Hostinger
  - Desactivado el 2026-04-26 al cambiar NS de Cloudflare a Hostinger (Squarespace lo exige).
  - Pasos: Hostinger → Dominios → DNSSEC → activar → copiar DS generados → Squarespace → Domain → DNSSEC → pegar DS → verificar con `dig +dnssec evolve2digital.com @1.1.1.1` (debe llevar flag `ad`).
  - Esperar al menos 1 semana de estabilidad antes de reactivar.
