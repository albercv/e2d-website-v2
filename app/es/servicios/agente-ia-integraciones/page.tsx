/**
 * Servicio: Integraciones y acciones extra del agente de IA
 * Propósito: Página mínima explicando coste por integración/acción adicional.
 * Entradas: Ninguna.
 * Salidas: Contenido con lista de ejemplos y CTA.
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
          src="/images/agente-extra-integracion.jpg"
          width={1200}
          height={630}
          alt="Integraciones y acciones extra"
          className="w-full h-auto rounded-md object-cover"
          priority
        />
      </div>
      <h1 className="text-3xl font-bold tracking-tight">Integraciones y acciones extra</h1>
      <p className="mt-4 text-muted-foreground">
        Cada integración o acción adicional del agente tiene un coste fijo por unidad.
      </p>
      <p className="mt-6 text-lg font-semibold">Precio por integración/acción: 300€</p>
      <h2 className="mt-8 text-xl font-semibold">Ejemplos</h2>
      <ul className="mt-4 list-disc pl-6 space-y-2">
        <li>CRM</li>
        <li>ERP</li>
        <li>Base de datos externa</li>
        <li>n8n</li>
        <li>Pagos</li>
        <li>Encender/apagar bot</li>
        <li>Cambio de parámetros del agente</li>
      </ul>
      <div className="mt-8">
        <Link href="/es#contacto" prefetch={false}>
          <Button>Contactar</Button>
        </Link>
      </div>
    </section>
  );
}
