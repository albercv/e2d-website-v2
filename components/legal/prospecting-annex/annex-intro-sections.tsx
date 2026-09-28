import { AnnexMailto, AnnexSection, ANNEX_LIST_CLASS, ANNEX_PARAGRAPH_CLASS } from "./annex-section"

// Text below is a VERBATIM reproduction of the legal source
// (politica-privacidad-anexo.md). Do not paraphrase or reorder.

/** Paragraph right under the h1 — no heading of its own. */
export function AnnexIntroParagraph() {
  return (
    <p className={`${ANNEX_PARAGRAPH_CLASS} mb-8`}>
      Evolve2Digital (E2D) ofrece servicios de automatización y software a medida a pequeñas y medianas empresas.
      Para encontrar negocios a los que esos servicios les pueden ser útiles, analizamos información pública de
      negocios. Este apartado explica qué datos tratamos, para qué y cómo puede oponerse.
    </p>
  )
}

export function ResponsableSection() {
  return (
    <AnnexSection id="responsable" title="Responsable">
      <p className={ANNEX_PARAGRAPH_CLASS}>
        Alberto Carrasco, empresario individual con nombre comercial E2D - Evolve2Digital, con NIF 51095475D y
        domicilio en Madrid (España). Contacto para cualquier cuestión de privacidad: <AnnexMailto />.
      </p>
    </AnnexSection>
  )
}

export function DatosSection() {
  return (
    <AnnexSection id="datos" title="Qué datos tratamos y de dónde salen">
      <p className={`${ANNEX_PARAGRAPH_CLASS} mb-4`}>Solo tratamos datos de negocio que el propio negocio ha publicado:</p>
      <ul className={ANNEX_LIST_CLASS}>
        <li>
          De su ficha pública de Google Maps, obtenida mediante el proveedor Apify: nombre comercial, categorías,
          dirección, código postal y municipio, teléfono publicado, web, enlace a la ficha, número de reseñas,
          valoración media, si está cerrado y la fecha de sus reseñas más recientes. No recogemos el texto de las
          reseñas ni ningún dato de quienes las escriben.
        </li>
        <li>
          De la web del negocio: mediciones técnicas (velocidad y tecnologías), capturas de pantalla, los textos
          publicados, el email de contacto publicado (con la página de la que sale) y los datos de su aviso legal
          sobre el titular y el tamaño del negocio.
        </li>
      </ul>
      <p className={`${ANNEX_PARAGRAPH_CLASS} mt-4`}>
        No compramos bases de datos ni buscamos datos de personas en otras fuentes. Si el negocio es de un
        empresario individual (autónomo), estos datos de negocio son datos personales suyos, y este apartado se
        aplica a ellos.
      </p>
    </AnnexSection>
  )
}

export function FinalidadesSection() {
  return (
    <AnnexSection id="finalidades" title="Para qué los tratamos">
      <ul className={ANNEX_LIST_CLASS}>
        <li>
          <strong>Prospección comercial:</strong> buscar negocios activos e independientes cuya web se puede
          mejorar, para ofrecerles nuestros servicios de automatización de la captación de clientes, con la web
          incluida.
        </li>
        <li>
          <strong>Evaluación y clasificación automáticas:</strong> nuestro sistema evalúa cada negocio de forma
          automática para decidir a quién dirigimos la prospección. Lo clasifica como cadena o negocio independiente,
          y como activo o no según el número y la fecha de sus reseñas; más adelante también valora la calidad
          técnica y visual de su web y ordena los negocios por la oportunidad de mejora. Si el negocio es de un
          empresario individual, esta evaluación es una elaboración de perfiles con fines de mercadotecnia directa,
          y puede oponerse a ella en cualquier momento (art. 21.2 RGPD), como se explica más abajo.
        </li>
        <li>
          <strong>Contacto:</strong> solo a unos pocos negocios les enviamos un único email con una propuesta, y
          cada envío lo revisa y aprueba una persona. No hacemos seguimientos automáticos.
        </li>
      </ul>
    </AnnexSection>
  )
}
