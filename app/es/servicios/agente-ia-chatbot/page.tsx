/**
 * Servicio: Agente de IA para chatbot (pack base)
 * Propósito: Página informativa mínima para evitar 404 desde el feed.
 * Entradas: Ninguna.
 * Salidas: Rendering del contenido del servicio con CTA a contacto.
 * Side-effects: Ninguno.
 */

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export default function Page() {
  return (
    <section className="container mx-auto max-w-3xl px-4 py-12">
      <div className="mb-8">
        <Image
          src="/images/agente-ia-chatbot.jpg"
          width={1200}
          height={630}
          alt="Agente IA Chatbot"
          className="w-full h-auto rounded-md object-cover"
          priority
        />
      </div>
      <h1 className="text-3xl font-bold tracking-tight">Agente de IA para chatbot (pack base)</h1>
      <p className="mt-4 text-muted-foreground">
        Implementación base de un agente de IA operativo 24/7, con RAG para respuestas
        basadas en tu contenido y flujo de calendario de citas integrado.
      </p>
      <ul className="mt-6 list-disc pl-6 space-y-2">
        <li>Disponibilidad <strong>24/7</strong> para atención continua.</li>
        <li>Integración de <strong>RAG</strong> para respuestas con contexto.</li>
        <li><strong>Calendario de citas</strong> para agendar reuniones automáticamente.</li>
      </ul>
      <p className="mt-6 text-lg font-semibold">Precio: 1500€</p>
      <div className="mt-8">
        <Link href="/es#contacto" prefetch={false}>
          <Button className="">Contactar</Button>
        </Link>
      </div>
    </section>
  );
}
