#!/usr/bin/env node

/**
 * Should Skip Build Script
 * 
 * Determina si se debe saltar el build completo basándose en los cambios.
 * Solo regenera archivos SEO/MCP si solo hay cambios en content/ o docs/.
 */

const { execSync } = require('child_process')

async function shouldSkipBuild() {
  try {
    // Obtener archivos cambiados desde el último commit
    const changedFiles = execSync('git diff --name-only HEAD~1 HEAD', { 
      encoding: 'utf8' 
    }).trim().split('\n').filter(Boolean)
    
    console.log('Changed files:', changedFiles)
    
    // Categorizar cambios
    const contentChanges = changedFiles.filter(file => 
      file.startsWith('content/') || 
      file.startsWith('docs/') ||
      file.startsWith('app/api/mcp/')
    )
    
    const codeChanges = changedFiles.filter(file => 
      !file.startsWith('content/') && 
      !file.startsWith('docs/') &&
      !file.startsWith('app/api/mcp/') &&
      !file.startsWith('public/') &&
      file !== 'package.json' &&
      file !== 'package-lock.json'
    )
    
    console.log('Content changes:', contentChanges.length)
    console.log('Code changes:', codeChanges.length)
    
    // Si solo hay cambios de contenido, regenerar SEO y saltar build
    if (contentChanges.length > 0 && codeChanges.length === 0) {
      console.log('Only content changes detected, regenerating SEO...')
      
      try {
        execSync('npm run seo:regenerate', { stdio: 'inherit' })
        console.log('SEO regeneration completed, skipping full build')
        process.exit(0) // Skip build
      } catch (error) {
        console.error('SEO regeneration failed, proceeding with full build')
        process.exit(1) // Proceed with build
      }
    }
    
    // Si hay cambios de código, proceder con build completo
    console.log('Code changes detected, proceeding with full build')
    process.exit(1) // Proceed with build
    
  } catch (error) {
    console.error('Error checking changes:', error.message)
    console.log('Proceeding with full build as fallback')
    process.exit(1) // Proceed with build on error
  }
}

shouldSkipBuild()
