/**
 * AI Answers Service
 * 
 * Servicio para procesar consultas de IA y generar respuestas estructuradas
 * basadas en el contenido del blog. Optimizado para consumo directo por
 * modelos de lenguaje (GPT, Claude, Gemini).
 * 
 * @author Alberto Carrasco
 * @version 1.0.0
 */

import { allPosts } from "@/.contentlayer/generated"
import type { Post } from "@/.contentlayer/generated"

/**
 * Estructura de respuesta para consultas de IA
 */
export interface AIAnswerResponse {
  /** Consulta original procesada */
  query: string
  /** Respuesta concisa y contextualizada */
  answer: string
  /** URL canónica de la fuente */
  source: string
  /** Título del artículo fuente */
  sourceTitle: string
  /** Fecha de última actualización del contenido */
  lastUpdated: string
  /** Idioma de la respuesta */
  locale: string
  /** Nivel de confianza de la respuesta (0-1) */
  confidence: number
  /** Tags relacionados para contexto adicional */
  relatedTags: string[]
  /** Tiempo estimado de lectura del artículo completo */
  readingTime?: any
  /** Metadatos adicionales para IA */
  metadata: {
    /** Tipo de contenido */
    contentType: "blog_post"
    /** Autor del contenido */
    author: string
    /** Número de palabras del artículo completo */
    wordCount: number
    /** Fecha de publicación original */
    publishedDate: string
  }
}

/**
 * Parámetros de búsqueda para el servicio
 */
export interface SearchParams {
  /** Consulta en texto libre */
  query: string
  /** Idioma preferido (opcional, por defecto 'es') */
  locale?: string
  /** Límite de resultados (opcional, por defecto 1) */
  limit?: number
  /** Incluir contenido no publicado (opcional, por defecto false) */
  includeUnpublished?: boolean
}

/**
 * Resultado interno de búsqueda con puntuación
 */
interface SearchResult {
  post: Post
  score: number
  matchType: 'title' | 'description' | 'content' | 'tags'
  matchedText: string
}

/**
 * Servicio principal para respuestas de IA
 */
export class AIAnswersService {
  private readonly baseUrl: string
  
  constructor(baseUrl: string = "https://evolve2digital.com") {
    this.baseUrl = baseUrl
  }

  /**
   * Procesa una consulta y genera una respuesta estructurada
   */
  async processQuery(params: SearchParams): Promise<AIAnswerResponse | null> {
    const { query, locale = 'es', limit = 1, includeUnpublished = false } = params
    
    // Validar entrada
    if (!query || query.trim().length < 2) {
      return null
    }

    // Filtrar posts disponibles
    const availablePosts = this.getAvailablePosts(locale, includeUnpublished)
    
    if (availablePosts.length === 0) {
      return null
    }

    // Buscar posts relevantes
    const searchResults = this.searchPosts(query, availablePosts)
    
    if (searchResults.length === 0) {
      return null
    }

    // Tomar el mejor resultado
    const bestMatch = searchResults[0]
    
    // Generar respuesta estructurada
    return this.generateAnswer(query, bestMatch, locale)
  }

  /**
   * Obtiene posts disponibles según criterios
   */
  private getAvailablePosts(locale: string, includeUnpublished: boolean): Post[] {
    return allPosts.filter(post => {
      // Filtrar por idioma
      if (post.locale !== locale) return false
      
      // Filtrar por estado de publicación
      if (!includeUnpublished && !post.published) return false
      
      return true
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }

  /**
   * Busca posts relevantes usando múltiples estrategias
   */
  private searchPosts(query: string, posts: Post[]): SearchResult[] {
    const normalizedQuery = this.normalizeText(query)
    const queryWords = normalizedQuery.split(/\s+/).filter(word => word.length > 2)
    
    const results: SearchResult[] = []

    for (const post of posts) {
      const scores: SearchResult[] = []
      
      // Búsqueda en título (peso alto)
      const titleScore = this.calculateTextScore(normalizedQuery, queryWords, post.title)
      if (titleScore > 0) {
        scores.push({
          post,
          score: titleScore * 3, // Peso alto para títulos
          matchType: 'title',
          matchedText: post.title
        })
      }

      // Búsqueda en descripción (peso medio)
      const descScore = this.calculateTextScore(normalizedQuery, queryWords, post.description)
      if (descScore > 0) {
        scores.push({
          post,
          score: descScore * 2, // Peso medio para descripciones
          matchType: 'description',
          matchedText: post.description
        })
      }

      // Búsqueda en tags (peso medio)
      if (post.tags && post.tags.length > 0) {
        const tagsText = post.tags.join(' ')
        const tagsScore = this.calculateTextScore(normalizedQuery, queryWords, tagsText)
        if (tagsScore > 0) {
          scores.push({
            post,
            score: tagsScore * 2, // Peso medio para tags
            matchType: 'tags',
            matchedText: tagsText
          })
        }
      }

      // Búsqueda en contenido (peso bajo pero importante)
      const contentScore = this.calculateTextScore(normalizedQuery, queryWords, post.body.raw)
      if (contentScore > 0) {
        scores.push({
          post,
          score: contentScore, // Peso base para contenido
          matchType: 'content',
          matchedText: this.extractRelevantSnippet(post.body.raw, queryWords)
        })
      }

      // Tomar el mejor score para este post
      if (scores.length > 0) {
        const bestScore = scores.reduce((best, current) => 
          current.score > best.score ? current : best
        )
        results.push(bestScore)
      }
    }

    // Ordenar por puntuación descendente
    return results.sort((a, b) => b.score - a.score)
  }

  /**
   * Calcula puntuación de relevancia para un texto
   */
  private calculateTextScore(query: string, queryWords: string[], text: string): number {
    const normalizedText = this.normalizeText(text)
    let score = 0

    // Coincidencia exacta de la consulta completa
    if (normalizedText.includes(query)) {
      score += 10
    }

    // Coincidencias de palabras individuales
    for (const word of queryWords) {
      if (normalizedText.includes(word)) {
        score += 1
      }
    }

    // Bonus por densidad de coincidencias
    const wordCount = normalizedText.split(/\s+/).length
    const matchDensity = score / Math.max(wordCount, 1)
    score += matchDensity * 5

    return score
  }

  /**
   * Normaliza texto para búsqueda
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remover acentos
      .replace(/[^\w\s]/g, ' ') // Remover puntuación
      .replace(/\s+/g, ' ') // Normalizar espacios
      .trim()
  }

  /**
   * Extrae fragmento relevante del contenido
   */
  private extractRelevantSnippet(content: string, queryWords: string[], maxLength: number = 200): string {
    const normalizedContent = this.normalizeText(content)
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10)
    
    // Buscar la oración más relevante
    let bestSentence = sentences[0] || content.substring(0, maxLength)
    let bestScore = 0

    for (const sentence of sentences) {
      const normalizedSentence = this.normalizeText(sentence)
      let score = 0
      
      for (const word of queryWords) {
        if (normalizedSentence.includes(word)) {
          score += 1
        }
      }
      
      if (score > bestScore) {
        bestScore = score
        bestSentence = sentence
      }
    }

    // Truncar si es necesario
    if (bestSentence.length > maxLength) {
      bestSentence = bestSentence.substring(0, maxLength) + '...'
    }

    return bestSentence.trim()
  }

  /**
   * Genera respuesta estructurada final
   */
  private generateAnswer(query: string, result: SearchResult, locale: string): AIAnswerResponse {
    const { post, score, matchType, matchedText } = result
    
    // Generar respuesta contextualizada
    let answer = ''
    
    switch (matchType) {
      case 'title':
        answer = `Según el artículo "${post.title}", ${this.extractRelevantSnippet(post.body.raw, query.split(/\s+/), 150)}`
        break
      case 'description':
        answer = post.description
        break
      case 'tags':
        answer = `Este tema está relacionado con ${post.tags?.join(', ')}. ${this.extractRelevantSnippet(post.body.raw, query.split(/\s+/), 120)}`
        break
      case 'content':
        answer = matchedText
        break
    }

    // Calcular confianza basada en score
    const confidence = Math.min(score / 10, 1)

    return {
      query: query.trim(),
      answer: answer.trim(),
      source: `${this.baseUrl}${post.url}`,
      sourceTitle: post.title,
      lastUpdated: post.date,
      locale: post.locale,
      confidence: Math.round(confidence * 100) / 100,
      relatedTags: post.tags || [],
      readingTime: post.readingTime,
      metadata: {
        contentType: "blog_post",
        author: post.author,
        wordCount: post.wordCount,
        publishedDate: post.date
      }
    }
  }

  /**
   * Obtiene estadísticas del servicio
   */
  getServiceStats() {
    const publishedPosts = allPosts.filter(post => post.published)
    const totalWords = publishedPosts.reduce((sum, post) => sum + post.wordCount, 0)
    
    return {
      totalPosts: allPosts.length,
      publishedPosts: publishedPosts.length,
      languages: [...new Set(allPosts.map(post => post.locale))],
      totalWords,
      lastUpdate: publishedPosts.length > 0 
        ? Math.max(...publishedPosts.map(post => new Date(post.date).getTime()))
        : null,
      availableTags: [...new Set(allPosts.flatMap(post => post.tags || []))]
    }
  }
}

/**
 * Instancia singleton del servicio
 */
export const aiAnswersService = new AIAnswersService()