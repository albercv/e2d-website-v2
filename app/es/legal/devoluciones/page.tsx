/**
 * Página: Política de devoluciones y reembolsos (servicios digitales)
 * Propósito: Proveer una URL estable para el feed `return_policy`.
 * Entradas: Ninguna.
 * Salidas: Contenido legal informativo, con CTA de contacto.
 * Side-effects: Ninguno.
 */

import Link from "next/link";

export default function Page() {
  return (
    <section className="container mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold tracking-tight">
        Política de devoluciones y reembolsos (servicios digitales)
      </h1>

      <p className="mt-4 text-muted-foreground">
        Esta política aplica a servicios de consultoría, desarrollo de agentes y otros servicios digitales
        prestados por Evolve2Digital (E2D).
      </p>

      <h2 className="mt-8 text-xl font-semibold">Plazo estándar de desistimiento</h2>
      <p className="mt-2">
        Cuando aplique conforme a la normativa vigente, el cliente dispone de un plazo estándar de
        <strong> 14 días naturales</strong> desde la contratación para desistir. En servicios digitales, el derecho de desistimiento puede
        no aplicar o quedar anulado si el servicio ha comenzado con el consentimiento expreso del cliente.
      </p>

      <h2 className="mt-8 text-xl font-semibold">Condiciones en las que NO hay reembolso</h2>
      <ul className="mt-2 list-disc pl-6 space-y-2">
        <li>
          El servicio ha sido <strong>prestado completamente</strong> o se ha iniciado con consentimiento expreso del cliente,
          anulando el derecho de desistimiento aplicable.
        </li>
        <li>
          Se han entregado <strong>entregables, implementaciones o integraciones</strong> específicas y personalizadas.
        </li>
        <li>
          Se han incurrido <strong>costes de terceros</strong> o licencias vinculadas a la prestación del servicio.
        </li>
        <li>
          Ha expirado el <strong>plazo de 14 días</strong> cuando corresponde.
        </li>
        <li>
          Uso indebido, incumplimiento contractual o <strong>fraude</strong> detectado.
        </li>
      </ul>

      <h2 className="mt-8 text-xl font-semibold">Cómo solicitar un reembolso</h2>
      <p className="mt-2">
        Para solicitar un reembolso, por favor envíe una solicitud indicando <em>número de pedido</em>,
        <em>servicio contratado</em>, <em>fecha</em> y <em>motivo</em> por uno de estos canales:
      </p>
      <ul className="mt-2 list-disc pl-6 space-y-2">
        <li>
          Email: <a className="underline" href="mailto:contacto@evolve2digital.com">contacto@evolve2digital.com</a>
          {" "}(asunto: &quot;Solicitud de reembolso&quot;).
        </li>
        <li>
          Formulario de contacto: <Link className="underline" href="/es#contacto">/es#contacto</Link>.
        </li>
      </ul>
      <p className="mt-4">
        Tras recibir su solicitud, E2D comunicará la recepción y realizará una evaluación. En caso de aprobación,
        el reembolso se tramitará al <strong>método de pago original</strong> en un plazo razonable (habitualmente dentro de
        <strong> 14 días</strong> desde la aprobación).
      </p>

      <h2 className="mt-8 text-xl font-semibold">Notas legales</h2>
      <p className="mt-2 text-muted-foreground">
        Esta política puede actualizarse para reflejar cambios normativos o operativos. En caso de discrepancia,
        prevalecerán los términos contractuales específicos acordados con el cliente.
      </p>
    </section>
  );
}
