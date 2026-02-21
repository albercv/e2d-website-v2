/**
 * Módulo compartido de productos Merchant
 * Propósito: centralizar el tipo MerchantProduct y los datos de productos
 * Entradas: ninguna
 * Salidas:
 *  - MerchantProduct (tipo)
 *  - PRODUCTS (array de MerchantProduct)
 *  - PRODUCTS_BY_ID (mapa id → MerchantProduct)
 * Side-effects: ninguno
 */

export type MerchantProduct = {
  enable_search: "true" | "false";
  enable_checkout: "true" | "false";
  id: string;
  mpn: string;
  title: string;
  description: string;
  link: string;
  condition: "new";
  product_category: string;
  brand: string;
  material: string;
  weight: string;
  age_group: string;
  image_link: string;
  additional_image_link: string[];
  price: string;
  availability: "in_stock" | "out_of_stock" | "preorder";
  inventory_quantity: number;
  seller_name: string;
  seller_url: string;
  seller_privacy_policy: string;
  seller_tos: string;
  return_policy: string;
  return_window: number;
};

const SELLER_URL = "https://evolve2digital.com";
const SELLER_PRIVACY = "https://evolve2digital.com/es/privacy";
const SELLER_TOS = "https://evolve2digital.com/es/legal";
const RETURN_POLICY = "https://evolve2digital.com/es/legal/devoluciones";

export const PRODUCTS: MerchantProduct[] = [
  {
    enable_search: "true",
    enable_checkout: "false",
    id: "agent_base_1500",
    mpn: "AGENT-BASE-1500",
    title: "Agente de Voz/IA Base",
    description: `Atiende clientes 24/7 mediante un agente conversacional conectado a tu contenido con RAG y a tu calendario para gestionar citas y reservas. Pensado para pymes que quieren automatizar atención y reservas sin meterse en un proyecto enorme.

Este servicio es para ti si:
- Necesitas automatizar respuestas frecuentes y captar citas.
- Quieres integrar tu calendario (Google/Outlook) para reservas.
- Tienes contenidos del negocio (FAQ, web, documentos) para la base RAG.
- Buscas empezar rápido con coste y alcance acotados.

No es para ti si:
- Requieres desarrollo a medida con múltiples integraciones avanzadas.
- Necesitas personalizaciones profundas o un SLA 24/7.`,
    link: "https://evolve2digital.com/es/servicios/agent-base",
    condition: "new",
    product_category: "software > automation",
    brand: "E2D",
    material: "digital",
    weight: "0g",
    age_group: "adult",
    image_link: "https://evolve2digital.com/images/agent-base.png",
    additional_image_link: [
      "https://evolve2digital.com/images/agent-base-1.png",
      "https://evolve2digital.com/images/agent-base-2.png",
    ],
    price: "EUR 1500",
    availability: "in_stock",
    inventory_quantity: 50,
    seller_name: "E2D - Evolve2Digital",
    seller_url: SELLER_URL,
    seller_privacy_policy: SELLER_PRIVACY,
    seller_tos: SELLER_TOS,
    return_policy: RETURN_POLICY,
    return_window: 14,
  },
  {
    enable_search: "true",
    enable_checkout: "false",
    id: "agent_extra_integration_300",
    mpn: "AGENT-EXTRA-INTEGRATION-300",
    title: "Integración Extra del Agente",
    description: `Cada unidad añade una integración o acción adicional al agente (1 unidad = 1 integración/acción). Ejemplos: CRM, ERP, API externa, base de datos, automatización en n8n, pagos, WhatsApp/email, encender/apagar el bot o ajustar parámetros.

Es para ti si:
- Quieres que el bot hable con tus sistemas y ejecute acciones reales.
- Necesitas ampliar capacidades con una conexión específica.
- Prefieres evolucionar de forma incremental, pagando por cada integración.

No es para ti si:
- Solo necesitas el agente base sin tocar sistemas internos.
- Buscas un paquete cerrado con muchas integraciones de golpe.`,
    link: "https://evolve2digital.com/es/servicios/agent-integracion-extra",
    condition: "new",
    product_category: "software > integration",
    brand: "E2D",
    material: "digital",
    weight: "0g",
    age_group: "adult",
    image_link: "https://evolve2digital.com/images/agent-integration.png",
    additional_image_link: [
      "https://evolve2digital.com/images/agent-integration-1.png",
    ],
    price: "EUR 300",
    availability: "in_stock",
    inventory_quantity: 200,
    seller_name: "E2D - Evolve2Digital",
    seller_url: SELLER_URL,
    seller_privacy_policy: SELLER_PRIVACY,
    seller_tos: SELLER_TOS,
    return_policy: RETURN_POLICY,
    return_window: 14,
  },
  {
    enable_search: "true",
    enable_checkout: "false",
    id: "agent_dashboard_1500",
    mpn: "AGENT-DASHBOARD-1500",
    title: "Dashboard del Agente",
    description: `Dashboard de métricas del agente: nº de conversaciones, horas punta, motivos de contacto, conversión a cita/lead y fallos frecuentes. Ofrece visualización y análisis; no añade nuevas acciones ni integraciones.

Es para ti si:
- Quieres decidir con datos y priorizar mejoras del agente.
- Necesitas seguimiento de rendimiento y detección de cuellos de botella.
- Buscas informes claros para negocio y operaciones.

No es para ti si:
- Solo buscas más funcionalidades técnicas o integraciones en el bot.
- Esperas automatizaciones adicionales desde el propio dashboard.`,
    link: "https://evolve2digital.com/es/servicios/agent-dashboard",
    condition: "new",
    product_category: "software > analytics",
    brand: "E2D",
    material: "digital",
    weight: "0g",
    age_group: "adult",
    image_link: "https://evolve2digital.com/images/agent-dashboard.png",
    additional_image_link: [
      "https://evolve2digital.com/images/agent-dashboard-1.png",
    ],
    price: "EUR 1500",
    availability: "in_stock",
    inventory_quantity: 40,
    seller_name: "E2D - Evolve2Digital",
    seller_url: SELLER_URL,
    seller_privacy_policy: SELLER_PRIVACY,
    seller_tos: SELLER_TOS,
    return_policy: RETURN_POLICY,
    return_window: 14,
  },
  {
    enable_search: "true",
    enable_checkout: "false",
    id: "consult_small_500",
    mpn: "CONSULT-SMALL-500",
    title: "Consultoría Pequeña",
    description: `Análisis de un problema concreto: 1 proceso principal, hasta 2 sistemas y 1 equipo. Incluye 1 hora de sesión y un documento de 1–2 páginas con contexto, solución propuesta, siguientes pasos y rango de inversión.

Este servicio es para ti si:
- Tienes un reto acotado y pocos sistemas implicados.
- Buscas claridad rápida para tomar una decisión.
- Quieres estimar inversión y priorizar el siguiente paso.

No es para ti si:
- Manejas muchos procesos o varios equipos a la vez.
- Buscas diseño técnico detallado o ejecución completa.`,
    link: "https://evolve2digital.com/es/servicios/consultoria-small",
    condition: "new",
    product_category: "services > consulting",
    brand: "E2D",
    material: "digital",
    weight: "0g",
    age_group: "adult",
    image_link: "https://evolve2digital.com/images/consulting-small.png",
    additional_image_link: [],
    price: "EUR 500",
    availability: "in_stock",
    inventory_quantity: 100,
    seller_name: "E2D - Evolve2Digital",
    seller_url: SELLER_URL,
    seller_privacy_policy: SELLER_PRIVACY,
    seller_tos: SELLER_TOS,
    return_policy: RETURN_POLICY,
    return_window: 14,
  },
  {
    enable_search: "true",
    enable_checkout: "false",
    id: "consult_medium_1500",
    mpn: "CONSULT-MEDIUM-1500",
    title: "Consultoría Media",
    description: `Evaluación para 2–4 procesos, hasta 3 sistemas y 1–2 equipos. Incluye varias sesiones (~3 h) y un documento de 4–8 páginas con roadmap por fases, riesgos y dependencias.

Es para ti si:
- Quieres un plan estructurado por fases para varias áreas del negocio.
- Necesitas ordenar prioridades y alinear equipos.
- Buscas una visión táctica con hitos y estimaciones de esfuerzo.

No es para ti si:
- Solo tienes un problema pequeño y puntual.
- En realidad necesitas una transformación completa y global.`,
    link: "https://evolve2digital.com/es/servicios/consultoria-medium",
    condition: "new",
    product_category: "services > consulting",
    brand: "E2D",
    material: "digital",
    weight: "0g",
    age_group: "adult",
    image_link: "https://evolve2digital.com/images/consulting-medium.png",
    additional_image_link: [],
    price: "EUR 1500",
    availability: "in_stock",
    inventory_quantity: 80,
    seller_name: "E2D - Evolve2Digital",
    seller_url: SELLER_URL,
    seller_privacy_policy: SELLER_PRIVACY,
    seller_tos: SELLER_TOS,
    return_policy: RETURN_POLICY,
    return_window: 14,
  },
  {
    enable_search: "true",
    enable_checkout: "false",
    id: "consult_large_3000",
    mpn: "CONSULT-LARGE-3000",
    title: "Consultoría Grande",
    description: `Evaluación integral: más de 4 procesos, más de 3 sistemas y varios equipos (marketing, ventas, operaciones, dirección). 6–8 h de trabajo y un documento de 10–20 páginas como blueprint por fases con riesgos, hitos y decisiones clave.

Es para ti si:
- Quieres un proyecto transformador y estás listo para invertir en algo grande.
- Necesitas una hoja de ruta de alto nivel que alinee a toda la organización.
- Buscas reducir riesgos y acelerar la ejecución con un plan sólido.

No es para ti si:
- Solo quieres resolver un problema puntual.
- Aún no tienes claro si quieres un proyecto de ese tamaño.`,
    link: "https://evolve2digital.com/es/servicios/consultoria-large",
    condition: "new",
    product_category: "services > consulting",
    brand: "E2D",
    material: "digital",
    weight: "0g",
    age_group: "adult",
    image_link: "https://evolve2digital.com/images/consulting-large.png",
    additional_image_link: [],
    price: "EUR 3000",
    availability: "in_stock",
    inventory_quantity: 60,
    seller_name: "E2D - Evolve2Digital",
    seller_url: SELLER_URL,
    seller_privacy_policy: SELLER_PRIVACY,
    seller_tos: SELLER_TOS,
    return_policy: RETURN_POLICY,
    return_window: 14,
  },
];

export const PRODUCTS_BY_ID: Record<string, MerchantProduct> = Object.fromEntries(
  PRODUCTS.map((p) => [p.id, p])
);
