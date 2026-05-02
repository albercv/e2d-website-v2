#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const projectRoot = process.cwd();
const sourceDir = path.join(projectRoot, '.next/static');
const targetDir = path.join(projectRoot, '.next/standalone/public/_next/static');

console.log('📦 Syncing static files to standalone build...');

try {
  // Crear directorios si no existen
  if (!fs.existsSync(path.join(projectRoot, '.next/standalone/public/_next'))) {
    fs.mkdirSync(path.join(projectRoot, '.next/standalone/public/_next'), { recursive: true });
    console.log('📁 Created directory: .next/standalone/public/_next');
  }

  // Copiar archivos estáticos
  if (fs.existsSync(sourceDir)) {
    if (fs.existsSync(targetDir)) {
      fs.rmSync(targetDir, { recursive: true });
      console.log('🗑️  Removed old static files');
    }
    fs.cpSync(sourceDir, targetDir, { recursive: true });
    console.log('✅ Static files copied successfully');
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
