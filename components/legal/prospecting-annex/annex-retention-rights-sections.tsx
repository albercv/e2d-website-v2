import { AnnexMailto, AnnexSection, ANNEX_LIST_CLASS, ANNEX_PARAGRAPH_CLASS } from "./annex-section"

// Text below is a VERBATIM reproduction of the legal source
// (politica-privacidad-anexo.md). Do not paraphrase or reorder.

export function ConservacionSection() {
  return (
    <AnnexSection id="conservacion" title="Cuánto tiempo los conservamos">
      <ul className={ANNEX_LIST_CLASS}>
        <li>
          <strong>Datos del análisis:</strong> 30 días desde que los recogemos, y después se borran. Solo
          conservamos estadísticas anónimas.
        </li>
        <li>
          <strong>Si le hemos enviado un email:</strong> el registro mínimo del envío y de su respuesta, y el
          buzón de envío, 12 meses.
        </li>
        <li>
          <strong>Consultas a la Lista Robinson:</strong> un mes desde la consulta.
        </li>
        <li>
          <strong>Si se opone:</strong> un registro mínimo, permanente, para no volver a tratar su negocio: el
          email y el teléfono solo seudonimizados con una clave (HMAC), y además el identificador de su ficha de
          Google Maps y el dominio de su web.
        </li>
        <li>
          <strong>Copias de seguridad:</strong> 7 días, y no incluyen los datos del análisis. En Google Drive, el
          administrador puede restaurar lo borrado durante 25 días.
        </li>
      </ul>
    </AnnexSection>
  )
}

export function DerechosSection() {
  return (
    <AnnexSection id="derechos" title="Sus derechos y cómo ejercerlos">
      <p className={`${ANNEX_PARAGRAPH_CLASS} mb-4`}>
        Puede ejercer los derechos de acceso, rectificación, supresión, limitación y oposición escribiendo a{" "}
        <AnnexMailto />. Indique el nombre de su negocio y su web o el enlace a su ficha de Google Maps, para que
        podamos localizarlo.
      </p>
      <ul className={ANNEX_LIST_CLASS}>
        <li id="oposicion">
          <strong>Oposición (art. 21 RGPD):</strong> puede oponerse en cualquier momento a la prospección comercial
          y a la elaboración de perfiles relacionada con ella, sin necesidad de justificarlo. Dejamos de tratar su
          negocio para ese fin y lo añadimos a nuestra lista de supresión permanente, de modo que no vuelva a
          analizarse ni a recibir comunicaciones.
        </li>
        <li>
          <strong>Supresión (art. 17 RGPD):</strong> borramos los datos de su negocio de los análisis en curso y
          guardamos solo el registro mínimo de supresión, para no volver a tratarlo.
        </li>
      </ul>
      <p className={`${ANNEX_PARAGRAPH_CLASS} mt-4`}>
        Si considera que no hemos atendido bien su solicitud, puede presentar una reclamación ante la Agencia
        Española de Protección de Datos (
        <a href="https://www.aepd.es" target="_blank" rel="noopener noreferrer">
          www.aepd.es
        </a>
        ).
      </p>
    </AnnexSection>
  )
}
