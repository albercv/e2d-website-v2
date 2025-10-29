/**
 * JSON-LD Schema Validation System
 * Validates Schema.org compliance and structured data quality
 * 
 * Features:
 * - Schema.org type validation
 * - Required properties checking
 * - Data format validation
 * - Multi-language support validation
 * - AI optimization compliance
 */

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
  score: number // 0-100 quality score
}

export interface ValidationError {
  type: 'MISSING_REQUIRED_PROPERTY' | 'INVALID_TYPE' | 'INVALID_FORMAT' | 'SCHEMA_VIOLATION'
  property: string
  message: string
  severity: 'error' | 'warning'
}

export interface ValidationWarning {
  type: 'MISSING_RECOMMENDED_PROPERTY' | 'SUBOPTIMAL_VALUE' | 'AI_OPTIMIZATION'
  property: string
  message: string
  suggestion: string
}

export class JsonLdValidator {
  private static readonly REQUIRED_PROPERTIES = {
    Organization: [
      '@context',
      '@type',
      'name',
      'url',
      'description'
    ],
    Person: [
      '@context',
      '@type',
      'name',
      'jobTitle'
    ],
    BlogPosting: [
      '@context',
      '@type',
      'headline',
      'author',
      'datePublished',
      'publisher',
      'mainEntityOfPage'
    ],
    WebSite: [
      '@context',
      '@type',
      'name',
      'url'
    ],
    Service: [
      '@context',
      '@type',
      'name',
      'provider',
      'serviceType'
    ]
  }

  private static readonly RECOMMENDED_PROPERTIES = {
    Organization: [
      'logo',
      'contactPoint',
      'address',
      'sameAs',
      'foundingDate',
      'areaServed'
    ],
    Person: [
      'url',
      'sameAs',
      'worksFor',
      'description',
      'knowsAbout'
    ],
    BlogPosting: [
      'description',
      'image',
      'dateModified',
      'wordCount',
      'keywords',
      'articleSection',
      'inLanguage'
    ],
    WebSite: [
      'description',
      'inLanguage',
      'publisher'
    ],
    Service: [
      'description',
      'category',
      'areaServed'
    ]
  }

  /**
   * Validates a JSON-LD schema object
   */
  static validateSchema(schema: any): ValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    // Basic structure validation
    if (!schema || typeof schema !== 'object') {
      errors.push({
        type: 'SCHEMA_VIOLATION',
        property: 'root',
        message: 'Schema must be a valid object',
        severity: 'error'
      })
      return { isValid: false, errors, warnings, score: 0 }
    }

    // Context validation
    if (!schema['@context']) {
      errors.push({
        type: 'MISSING_REQUIRED_PROPERTY',
        property: '@context',
        message: '@context is required for Schema.org compliance',
        severity: 'error'
      })
    } else if (schema['@context'] !== 'https://schema.org') {
      errors.push({
        type: 'INVALID_FORMAT',
        property: '@context',
        message: '@context should be "https://schema.org"',
        severity: 'error'
      })
    }

    // Type validation
    if (!schema['@type']) {
      errors.push({
        type: 'MISSING_REQUIRED_PROPERTY',
        property: '@type',
        message: '@type is required to identify schema type',
        severity: 'error'
      })
      return { isValid: false, errors, warnings, score: 0 }
    }

    const schemaType = schema['@type']
    
    // Validate required properties for the schema type
    const requiredProps = this.REQUIRED_PROPERTIES[schemaType as keyof typeof this.REQUIRED_PROPERTIES]
    if (requiredProps) {
      for (const prop of requiredProps) {
        if (!schema[prop]) {
          errors.push({
            type: 'MISSING_REQUIRED_PROPERTY',
            property: prop,
            message: `Required property '${prop}' is missing for ${schemaType}`,
            severity: 'error'
          })
        }
      }
    }

    // Check recommended properties
    const recommendedProps = this.RECOMMENDED_PROPERTIES[schemaType as keyof typeof this.RECOMMENDED_PROPERTIES]
    if (recommendedProps) {
      for (const prop of recommendedProps) {
        if (!schema[prop]) {
          warnings.push({
            type: 'MISSING_RECOMMENDED_PROPERTY',
            property: prop,
            message: `Recommended property '${prop}' is missing`,
            suggestion: `Adding '${prop}' will improve SEO and AI understanding`
          })
        }
      }
    }

    // Specific validations by type
    this.validateSpecificType(schema, schemaType, errors, warnings)

    // Calculate quality score
    const score = this.calculateQualityScore(schema, schemaType, errors, warnings)

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score
    }
  }

  /**
   * Validates specific schema types with custom rules
   */
  private static validateSpecificType(
    schema: any,
    type: string,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    switch (type) {
      case 'Organization':
        this.validateOrganization(schema, errors, warnings)
        break
      case 'Person':
        this.validatePerson(schema, errors, warnings)
        break
      case 'BlogPosting':
        this.validateBlogPosting(schema, errors, warnings)
        break
    }
  }

  private static validateOrganization(schema: any, errors: ValidationError[], warnings: ValidationWarning[]): void {
    // URL validation
    if (schema.url && !this.isValidUrl(schema.url)) {
      errors.push({
        type: 'INVALID_FORMAT',
        property: 'url',
        message: 'Organization URL must be a valid URL',
        severity: 'error'
      })
    }

    // Logo validation
    if (schema.logo && !this.isValidUrl(schema.logo) && !schema.logo.startsWith('/')) {
      warnings.push({
        type: 'SUBOPTIMAL_VALUE',
        property: 'logo',
        message: 'Logo should be a valid URL or absolute path',
        suggestion: 'Use a full URL or absolute path for better compatibility'
      })
    }

    // Contact point validation
    if (schema.contactPoint) {
      if (!schema.contactPoint.email && !schema.contactPoint.telephone) {
        warnings.push({
          type: 'MISSING_RECOMMENDED_PROPERTY',
          property: 'contactPoint',
          message: 'Contact point should include email or telephone',
          suggestion: 'Add email or telephone for better user experience'
        })
      }
    }
  }

  private static validatePerson(schema: any, errors: ValidationError[], warnings: ValidationWarning[]): void {
    // Name validation
    if (schema.name && typeof schema.name !== 'string') {
      errors.push({
        type: 'INVALID_TYPE',
        property: 'name',
        message: 'Person name must be a string',
        severity: 'error'
      })
    }

    // Job title validation
    if (schema.jobTitle && typeof schema.jobTitle !== 'string' && typeof schema.jobTitle !== 'object') {
      errors.push({
        type: 'INVALID_TYPE',
        property: 'jobTitle',
        message: 'Job title must be a string or localized object',
        severity: 'error'
      })
    }

    // URL validation
    if (schema.url && !this.isValidUrl(schema.url)) {
      errors.push({
        type: 'INVALID_FORMAT',
        property: 'url',
        message: 'Person URL must be a valid URL',
        severity: 'error'
      })
    }
  }

  private static validateBlogPosting(schema: any, errors: ValidationError[], warnings: ValidationWarning[]): void {
    // Date validation
    if (schema.datePublished && !this.isValidDate(schema.datePublished)) {
      errors.push({
        type: 'INVALID_FORMAT',
        property: 'datePublished',
        message: 'datePublished must be a valid ISO 8601 date',
        severity: 'error'
      })
    }

    if (schema.dateModified && !this.isValidDate(schema.dateModified)) {
      errors.push({
        type: 'INVALID_FORMAT',
        property: 'dateModified',
        message: 'dateModified must be a valid ISO 8601 date',
        severity: 'error'
      })
    }

    // Author validation
    if (schema.author && typeof schema.author === 'object') {
      if (!schema.author['@type'] || schema.author['@type'] !== 'Person') {
        errors.push({
          type: 'INVALID_TYPE',
          property: 'author',
          message: 'Author must be a Person type',
          severity: 'error'
        })
      }
    }

    // Publisher validation
    if (schema.publisher && typeof schema.publisher === 'object') {
      if (!schema.publisher['@type'] || schema.publisher['@type'] !== 'Organization') {
        errors.push({
          type: 'INVALID_TYPE',
          property: 'publisher',
          message: 'Publisher must be an Organization type',
          severity: 'error'
        })
      }
    }

    // AI optimization checks
    if (!schema.keywords || !Array.isArray(schema.keywords) || schema.keywords.length === 0) {
      warnings.push({
        type: 'AI_OPTIMIZATION',
        property: 'keywords',
        message: 'Keywords array is missing or empty',
        suggestion: 'Add relevant keywords to improve AI content understanding'
      })
    }

    if (!schema.articleSection) {
      warnings.push({
        type: 'AI_OPTIMIZATION',
        property: 'articleSection',
        message: 'Article section is missing',
        suggestion: 'Add articleSection to help AI categorize content'
      })
    }
  }

  /**
   * Calculates a quality score based on completeness and best practices
   */
  private static calculateQualityScore(
    schema: any,
    type: string,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): number {
    let score = 100

    // Deduct points for errors
    score -= errors.length * 20

    // Deduct points for warnings
    score -= warnings.length * 5

    // Bonus points for AI optimization features
    if (type === 'BlogPosting') {
      if (schema.keywords && Array.isArray(schema.keywords) && schema.keywords.length > 0) {
        score += 5
      }
      if (schema.articleSection) {
        score += 5
      }
      if (schema.wordCount) {
        score += 3
      }
      if (schema.inLanguage) {
        score += 3
      }
    }

    if (type === 'Organization') {
      if (schema.sameAs && Array.isArray(schema.sameAs) && schema.sameAs.length > 0) {
        score += 5
      }
      if (schema.knowsAbout && Array.isArray(schema.knowsAbout)) {
        score += 5
      }
    }

    return Math.max(0, Math.min(100, score))
  }

  /**
   * Utility methods
   */
  private static isValidUrl(url: string): boolean {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  private static isValidDate(date: string): boolean {
    const parsedDate = new Date(date)
    return !isNaN(parsedDate.getTime()) && date.includes('T') // ISO 8601 format
  }

  /**
   * Validates multiple schemas at once
   */
  static validateMultipleSchemas(schemas: any[]): ValidationResult[] {
    return schemas.map(schema => this.validateSchema(schema))
  }

  /**
   * Generates a validation report
   */
  static generateValidationReport(results: ValidationResult[]): string {
    let report = '# JSON-LD Validation Report\n\n'
    
    const totalSchemas = results.length
    const validSchemas = results.filter(r => r.isValid).length
    const averageScore = results.reduce((sum, r) => sum + r.score, 0) / totalSchemas

    report += `## Summary\n`
    report += `- Total schemas: ${totalSchemas}\n`
    report += `- Valid schemas: ${validSchemas}\n`
    report += `- Success rate: ${((validSchemas / totalSchemas) * 100).toFixed(1)}%\n`
    report += `- Average quality score: ${averageScore.toFixed(1)}/100\n\n`

    results.forEach((result, index) => {
      report += `## Schema ${index + 1}\n`
      report += `- Valid: ${result.isValid ? '✅' : '❌'}\n`
      report += `- Quality Score: ${result.score}/100\n`
      
      if (result.errors.length > 0) {
        report += `\n### Errors:\n`
        result.errors.forEach(error => {
          report += `- **${error.property}**: ${error.message}\n`
        })
      }

      if (result.warnings.length > 0) {
        report += `\n### Warnings:\n`
        result.warnings.forEach(warning => {
          report += `- **${warning.property}**: ${warning.message}\n`
          report += `  *Suggestion: ${warning.suggestion}*\n`
        })
      }

      report += '\n'
    })

    return report
  }
}