/**
 * Servicio: Consultoría para proyecto grande
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
          src="/images/consultoria-grande.jpg"
          width={1200}
          height={630}
          alt="Consultoría – Grande"
          className="w-full h-auto rounded-md object-cover"
          priority
        />
      </div>
      <h1 className="text-3xl font-bold tracking-tight">Consultoría – Proyecto grande</h1>
      <p className="mt-4 text-muted-foreground">
        Para organizaciones con múltiples dependencias y necesidades de orquestación avanzada.
      </p>
      <h2 className="mt-8 text-xl font-semibold">¿Para quién es?</h2>
      <p className="mt-2">Organizaciones con varios equipos y gobernanza transversal.</p>
      <h2 className="mt-6 text-xl font-semibold">Procesos y sistemas</h2>
      <p className="mt-2">Hasta 12 procesos y 6 sistemas implicados.</p>
      <h2 className="mt-6 text-xl font-semibold">Incluye</h2>
      <ul className="mt-2 list-disc pl-6 space-y-2">
        <li>Assessment integral técnico y operativo.</li>
        <li>Arquitectura de referencia y hoja de ruta.</li>
        <li>Riesgos, dependencias y plan de mitigación.</li>
      </ul>
      <h2 className="mt-6 text-xl font-semibold">No incluye</h2>
      <ul className="mt-2 list-disc pl-6 space-y-2">
        <li>Implementación completa de programas o PMO.</li>
        <li>Soporte continuo fuera del alcance definido.</li>
      </ul>
      <p className="mt-6 text-lg font-semibold">Precio: 3000€</p>
      <div className="mt-8">
        <Link href="/es#contacto" prefetch={false}>
          <Button>Contactar</Button>
        </Link>
      </div>
    </section>
  );
}
