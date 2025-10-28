#!/usr/bin/env node

/**
 * JSON-LD Validation Script
 * Validates JSON-LD schemas in built HTML files for Schema.org compliance
 * Compatible with Next.js SSG output
 */

const fs = require('fs');
const path = require('path');

// Import validation logic (we'll need to compile TypeScript or use a simpler approach)
// For now, we'll implement basic validation in JavaScript

class JsonLdValidator {
  static REQUIRED_PROPERTIES = {
    Organization: ['@context', '@type', 'name', 'url', 'description'],
    Person: ['@context', '@type', 'name', 'jobTitle'],
    BlogPosting: ['@context', '@type', 'headline', 'author', 'datePublished', 'publisher', 'mainEntityOfPage'],
    WebSite: ['@context', '@type', 'name', 'url'],
    Service: ['@context', '@type', 'name', 'provider', 'serviceType']
  }

  static validateSchema(schema) {
    const errors = []
    const warnings = []

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
    
    // Validate required properties
    const requiredProps = this.REQUIRED_PROPERTIES[schemaType]
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

    // Calculate basic score
    let score = 100 - (errors.length * 20) - (warnings.length * 5)
    score = Math.max(0, Math.min(100, score))

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score
    }
  }
}

// Find HTML files in the build directory
function findHtmlFiles(dir) {
  const htmlFiles = [];
  
  // Check for Next.js build output directories
  const possibleDirs = [
    path.join(dir, '.next', 'server', 'app'),
    path.join(dir, '.next', 'static'),
    path.join(dir, 'out'),
    path.join(dir, 'dist'),
    path.join(dir, 'build')
  ];
  
  for (const buildDir of possibleDirs) {
    if (fs.existsSync(buildDir)) {
      console.log(`📁 Found build directory: ${buildDir}`);
      findHtmlFilesRecursive(buildDir, htmlFiles);
      break;
    }
  }
  
  return htmlFiles;
}

function findHtmlFilesRecursive(dir, htmlFiles) {
  try {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        findHtmlFilesRecursive(filePath, htmlFiles);
      } else if (file.endsWith('.html')) {
        htmlFiles.push(filePath);
      }
    }
  } catch (error) {
    // Ignore permission errors or missing directories
  }
}

// Simple HTML parser without external dependencies
function extractJsonLdFromHtml(htmlContent) {
  const jsonLdScripts = [];
  const scriptRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  
  while ((match = scriptRegex.exec(htmlContent)) !== null) {
    try {
      const jsonContent = match[1].trim();
      const parsedJson = JSON.parse(jsonContent);
      jsonLdScripts.push(parsedJson);
    } catch (error) {
      console.warn(`Warning: Invalid JSON-LD found: ${error.message}`);
    }
  }
  
  return jsonLdScripts;
}

async function validateSite() {
  console.log('🔍 Starting JSON-LD validation...\n');
  
  const projectRoot = process.cwd();
  
  // Check for build directories
  const possibleDirs = [
    path.join(projectRoot, '.next'),
    path.join(projectRoot, 'out'),
    path.join(projectRoot, 'dist'),
    path.join(projectRoot, 'build')
  ];
  
  let buildDirExists = false;
  for (const dir of possibleDirs) {
    if (fs.existsSync(dir)) {
      buildDirExists = true;
      break;
    }
  }
  
  if (!buildDirExists) {
    console.error('❌ Build directory not found. Please run "npm run build" first.');
    process.exit(1);
  }
  
  const htmlFiles = findHtmlFiles(projectRoot);
  
  if (htmlFiles.length === 0) {
    console.log('⚠️  No HTML files found in build output.');
    console.log('💡 This might be normal for a Next.js app with SSR/ISR.');
    console.log('   Consider testing with a deployed version or static export.');
    process.exit(0);
  }
  
  console.log(`📄 Found ${htmlFiles.length} HTML files to validate\n`);
  
  const results = {
    totalFiles: htmlFiles.length,
    filesWithSchemas: 0,
    totalSchemas: 0,
    validSchemas: 0,
    errors: [],
    warnings: [],
    schemaTypes: {}
  };
  
  for (const filePath of htmlFiles) {
    try {
      const htmlContent = fs.readFileSync(filePath, 'utf8');
      const schemas = extractJsonLdFromHtml(htmlContent);
      
      if (schemas.length > 0) {
        results.filesWithSchemas++;
        results.totalSchemas += schemas.length;
        
        const relativePath = path.relative(projectRoot, filePath);
        console.log(`🔍 ${relativePath}: ${schemas.length} schema(s)`);
        
        for (const schema of schemas) {
          const schemaType = schema['@type'];
          if (schemaType) {
            results.schemaTypes[schemaType] = (results.schemaTypes[schemaType] || 0) + 1;
            
            const validation = JsonLdValidator.validateSchema(schema, schemaType);
            
            if (validation.isValid) {
              results.validSchemas++;
              console.log(`  ✅ ${schemaType}: Valid (Score: ${validation.score}/100)`);
            } else {
              console.log(`  ❌ ${schemaType}: Invalid (Score: ${validation.score}/100)`);
              validation.errors.forEach(error => {
                console.log(`     - ${error.message}`);
                results.errors.push({
                  file: relativePath,
                  schemaType,
                  error: error.message
                });
              });
            }
            
            validation.warnings.forEach(warning => {
              console.log(`  ⚠️  ${schemaType}: ${warning.message}`);
              results.warnings.push({
                file: relativePath,
                schemaType,
                warning: warning.message
              });
            });
          }
        }
      }
    } catch (error) {
      console.error(`❌ Error processing ${filePath}: ${error.message}`);
    }
  }
  
  // Generate summary
  console.log('\n📊 Validation Summary:');
  console.log(`   Files processed: ${results.totalFiles}`);
  console.log(`   Files with schemas: ${results.filesWithSchemas}`);
  console.log(`   Total schemas: ${results.totalSchemas}`);
  console.log(`   Valid schemas: ${results.validSchemas}`);
  console.log(`   Invalid schemas: ${results.totalSchemas - results.validSchemas}`);
  console.log(`   Errors: ${results.errors.length}`);
  console.log(`   Warnings: ${results.warnings.length}`);
  
  console.log('\n📈 Schema Types Found:');
  Object.entries(results.schemaTypes).forEach(([type, count]) => {
    console.log(`   ${type}: ${count}`);
  });
  
  // Save detailed report
  const reportDir = path.join(projectRoot, 'validation-reports');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  const reportPath = path.join(reportDir, `json-ld-validation-${new Date().toISOString().split('T')[0]}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  
  // Exit with appropriate code
  if (results.errors.length > 0) {
    console.log('\n❌ Validation completed with errors.');
    process.exit(1);
  } else {
    console.log('\n✅ Validation completed successfully!');
    process.exit(0);
  }
}

// Run validation
validateSite()