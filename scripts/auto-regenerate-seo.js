#!/usr/bin/env node

/**
 * Auto-Regenerate SEO Files
 * 
 * File watcher que detecta cambios en:
 * - content slash star star slash star dot mdx (posts del blog)
 * - content slash star star slash star dot md (documentación)
 * - docs slash star star slash star dot md (documentación adicional)
 * - app slash api slash mcp slash star star slash star dot ts (endpoints MCP)
 * 
 * Y regenera automáticamente:
 * - Sitemap con posts del blog
 * - RSS feeds optimizados para IA
 * - Documentación MCP
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Configuración
const DEBOUNCE_DELAY = 2000; // 2 segundos
const WATCH_PATTERNS = [
  'content/**/*.mdx',
  'content/**/*.md', 
  'docs/**/*.md',
  'app/api/mcp/**/*.ts'
];

let regenerationTimeout = null;
let isRegenerating = false;

/**
 * Ejecuta la regeneración de archivos SEO
 */
async function regenerateSEO() {
  if (isRegenerating) {
    console.log('⏳ Regeneración ya en progreso, saltando...');
    return;
  }

  isRegenerating = true;
  console.log('\n🔄 Iniciando regeneración automática de SEO...');
  
  try {
    // Primero regenerar Contentlayer
    console.log('📚 Regenerando Contentlayer...');
    await runCommand('npx', ['contentlayer2', 'build']);
    
    // Luego regenerar archivos SEO
    console.log('🚀 Regenerando archivos SEO...');
    await runCommand('npm', ['run', 'seo:regenerate']);
    
    console.log('✅ Regeneración completada exitosamente!\n');
  } catch (error) {
    console.error('❌ Error durante la regeneración:', error.message);
  } finally {
    isRegenerating = false;
  }
}

/**
 * Ejecuta un comando y retorna una promesa
 */
function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { 
      stdio: 'pipe',
      shell: true 
    });
    
    let output = '';
    let errorOutput = '';
    
    child.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        console.log(output);
        resolve(output);
      } else {
        console.error(errorOutput);
        reject(new Error(`Command failed with code ${code}: ${errorOutput}`));
      }
    });
    
    child.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Maneja los cambios de archivos con debounce
 */
function handleFileChange(eventType, filename) {
  if (!filename) return;
  
  console.log(`📝 Detectado cambio: ${eventType} en ${filename}`);
  
  // Limpiar timeout anterior
  if (regenerationTimeout) {
    clearTimeout(regenerationTimeout);
  }
  
  // Programar nueva regeneración
  regenerationTimeout = setTimeout(() => {
    regenerateSEO();
  }, DEBOUNCE_DELAY);
}

/**
 * Configura el file watcher usando fs.watch nativo
 */
function setupFileWatcher() {
  const watchDirs = [
    'content',
    'docs', 
    'app/api/mcp'
  ];
  
  console.log('👀 Configurando file watcher...');
  
  watchDirs.forEach(dir => {
    const fullPath = path.resolve(dir);
    
    if (fs.existsSync(fullPath)) {
      console.log(`📁 Watching: ${fullPath}`);
      
      // Watch recursivo
      function watchRecursive(dirPath) {
        try {
          const watcher = fs.watch(dirPath, { recursive: true }, (eventType, filename) => {
            if (filename && (
              filename.endsWith('.mdx') || 
              filename.endsWith('.md') || 
              filename.endsWith('.ts')
            )) {
              handleFileChange(eventType, path.join(dirPath, filename));
            }
          });
          
          watcher.on('error', (error) => {
            console.error(`❌ Error watching ${dirPath}:`, error.message);
          });
          
        } catch (error) {
          console.error(`❌ No se pudo configurar watcher para ${dirPath}:`, error.message);
        }
      }
      
      watchRecursive(fullPath);
    } else {
      console.log(`⚠️  Directorio no encontrado: ${fullPath}`);
    }
  });
}

/**
 * Función principal
 */
async function main() {
  console.log('🚀 Auto-Regenerate SEO - Iniciando...\n');
  
  // Verificar si debe hacer regeneración inicial
  const args = process.argv.slice(2);
  const skipInitial = args.includes('--no-initial');
  
  if (!skipInitial) {
    console.log('🔄 Ejecutando regeneración inicial...');
    await regenerateSEO();
  }
  
  // Configurar file watcher
  setupFileWatcher();
  
  console.log('\n✅ File watcher configurado correctamente!');
  console.log('📝 Detectando cambios en:');
  WATCH_PATTERNS.forEach(pattern => {
    console.log(`   - ${pattern}`);
  });
  console.log('\n⏱️  Debounce delay:', DEBOUNCE_DELAY + 'ms');
  console.log('🛑 Presiona Ctrl+C para detener\n');
  
  // Manejar señales de terminación
  process.on('SIGINT', () => {
    console.log('\n👋 Deteniendo file watcher...');
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    console.log('\n👋 Deteniendo file watcher...');
    process.exit(0);
  });
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
}

module.exports = {
  regenerateSEO,
  setupFileWatcher,
  handleFileChange
};