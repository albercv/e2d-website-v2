/**
 * Servicio: Consultoría para proyecto mediano
 * Propósito: Página mínima con criterios, alcance, precio y CTA.
 * Entradas: Ninguna.
 * Salidas: Contenido informativo estático para evitar 404.
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
          src="/images/consultoria-mediana.jpg"
          width={1200}
          height={630}
          alt="Consultoría – Mediana"
          className="w-full h-auto rounded-md object-cover"
          priority
        />
      </div>
      <h1 className="text-3xl font-bold tracking-tight">Consultoría – Proyecto mediano</h1>
      <p className="mt-4 text-muted-foreground">
        Para equipos con varios flujos en producción que necesitan alineación técnica y operativa.
      </p>
      <h2 className="mt-8 text-xl font-semibold">¿Para quién es?</h2>
      <p className="mt-2">Equipos con alcance a varias áreas y dependencias.</p>
      <h2 className="mt-6 text-xl font-semibold">Procesos y sistemas</h2>
      <p className="mt-2">Hasta 6 procesos y 4 sistemas implicados.</p>
      <h2 className="mt-6 text-xl font-semibold">Incluye</h2>
      <ul className="mt-2 list-disc pl-6 space-y-2">
        <li>Workshop y análisis de arquitectura.</li>
        <li>Recomendaciones de calidad, seguridad y performance.</li>
        <li>Plan de mejoras y prioridades por impacto.</li>
      </ul>
      <h2 className="mt-6 text-xl font-semibold">No incluye</h2>
      <ul className="mt-2 list-disc pl-6 space-y-2">
        <li>Desarrollo de nuevas features o integraciones extensas.</li>
        <li>Soporte 24/7 o mantenimiento continuo.</li>
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
