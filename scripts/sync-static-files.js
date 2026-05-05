#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const projectRoot = process.cwd();
const sourceDir = path.join(projectRoot, '.next/static');
// El standalone server resuelve /_next/static/* a <distDir>/static/*. Su distDir
// relativo es ./.next y arranca con process.chdir(__dirname) → la ruta efectiva
// es .next/standalone/.next/static/. Copiar a public/_next/static/ NO funciona
// porque /_next/* lo intercepta el runtime antes que el static handler de public.
const targetDir = path.join(projectRoot, '.next/standalone/.next/static');

console.log('📦 Syncing static files to standalone build...');

try {
  // Asegurar que el dir padre exista (next build lo crea, pero por idempotencia)
  fs.mkdirSync(path.dirname(targetDir), { recursive: true });

  // Copiar archivos estáticos
  if (fs.existsSync(sourceDir)) {
    if (fs.existsSync(targetDir)) {
      fs.rmSync(targetDir, { recursive: true });
      console.log('🗑️  Removed old static files');
    }
    fs.cpSync(sourceDir, targetDir, { recursive: true });
    console.log('✅ Static files copied to .next/standalone/.next/static/');
  } else {
    console.warn('⚠️  Source directory not found:', sourceDir);
  }

  // Copiar archivos públicos
  const publicSource = path.join(projectRoot, 'public');
  const publicTarget = path.join(projectRoot, '.next/standalone/public');

  if (fs.existsSync(publicSource)) {
    const files = fs.readdirSync(publicSource);
    files.forEach(file => {
      const src = path.join(publicSource, file);
      const dest = path.join(publicTarget, file);

      // No sobrescribir _next (ya está sincronizado)
      if (file !== '_next') {
        if (fs.lstatSync(src).isDirectory()) {
          if (fs.existsSync(dest)) {
            fs.rmSync(dest, { recursive: true });
          }
          fs.cpSync(src, dest, { recursive: true });
        } else {
          fs.copyFileSync(src, dest);
        }
      }
    });
    console.log('✅ Public files synced');
  }

  console.log('✨ Static files sync completed!');
  process.exit(0);
} catch (error) {
  console.error('❌ Error syncing static files:', error.message);
  process.exit(1);
}
