/**
 * Servicio: Dashboard del Agente de IA
 * Propósito: Página mínima que describe métricas del dashboard y CTA.
 * Entradas: Ninguna.
 * Salidas: Contenido informativo con precio y llamada a contacto.
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
          src="/images/dashboard-agente-ia.jpg"
          width={1200}
          height={630}
          alt="Dashboard Agente IA"
          className="w-full h-auto rounded-md object-cover"
          priority
        />
      </div>
      <h1 className="text-3xl font-bold tracking-tight">Dashboard del agente de IA</h1>
      <p className="mt-4 text-muted-foreground">
        Visualiza el rendimiento del agente con métricas clave para la toma de decisiones.
      </p>
      <h2 className="mt-8 text-xl font-semibold">Métricas</h2>
      <ul className="mt-4 list-disc pl-6 space-y-2">
        <li>Conversaciones totales y activas</li>
        <li>Ratio de resolución y derivaciones</li>
        <li>Tiempo medio de respuesta</li>
        <li>Calidad de respuestas (feedback)</li>
        <li>Conversiones (citas, formularios, ventas)</li>
      </ul>
      <p className="mt-6 text-lg font-semibold">Precio: 1500€</p>
      <div className="mt-8">
        <Link href="/es#contacto" prefetch={false}>
          <Button>Contactar</Button>
        </Link>
      </div>
    </section>
  );
}
