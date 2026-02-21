/**
 * Servicio: Consultoría para proyecto pequeño
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
          src="/images/consultoria-pequena.jpg"
          width={1200}
          height={630}
          alt="Consultoría – Pequeña"
          className="w-full h-auto rounded-md object-cover"
          priority
        />
      </div>
      <h1 className="text-3xl font-bold tracking-tight">Consultoría – Proyecto pequeño</h1>
      <p className="mt-4 text-muted-foreground">
        Para equipos y proyectos en fase inicial que requieren dirección técnica táctica.
      </p>
      <h2 className="mt-8 text-xl font-semibold">¿Para quién es?</h2>
      <p className="mt-2">Startups o equipos pequeños con alcance acotado.</p>
      <h2 className="mt-6 text-xl font-semibold">Procesos y sistemas</h2>
      <p className="mt-2">Hasta 2 procesos y 2 sistemas implicados.</p>
      <h2 className="mt-6 text-xl font-semibold">Incluye</h2>
      <ul className="mt-2 list-disc pl-6 space-y-2">
        <li>Sesión de trabajo (hasta 2 horas).</li>
        <li>Recomendaciones técnicas y priorización.</li>
        <li>Roadmap táctico inmediato.</li>
      </ul>
      <h2 className="mt-6 text-xl font-semibold">No incluye</h2>
      <ul className="mt-2 list-disc pl-6 space-y-2">
        <li>Implementaciones, integraciones o desarrollo continuo.</li>
        <li>Gestión de proyecto extendida.</li>
      </ul>
      <p className="mt-6 text-lg font-semibold">Precio: 500€</p>
      <div className="mt-8">
        <Link href="/es#contacto" prefetch={false}>
          <Button>Contactar</Button>
        </Link>
      </div>
    </section>
  );
}
