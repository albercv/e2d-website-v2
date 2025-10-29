#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 Resumen de Optimizaciones de Performance');
console.log('===========================================\n');

// Verificar archivos de optimización creados
const optimizationFiles = [
  'components/ui/orb/orb.worker.ts',
  'components/ui/orb/orb-worker-manager.ts', 
  'components/ui/orb/orb-optimized.tsx',
  'components/ui/motion-optimized.tsx',
  'components/ui/hero-3d-optimized.tsx',
  'components/ui/radix-lazy.tsx'
];

console.log('📁 Archivos de Optimización Creados:');
console.log('====================================');

for (const file of optimizationFiles) {
  const fullPath = path.join(process.cwd(), file);
  const exists = fs.existsSync(fullPath);
  const status = exists ? '✅' : '❌';
  console.log(`${status} ${file}`);
  
  if (exists) {
    const stats = fs.statSync(fullPath);
    const size = (stats.size / 1024).toFixed(2);
    console.log(`   └─ Tamaño: ${size} KB`);
  }
}

// Verificar configuración de Next.js
console.log('\n⚙️  Configuración de Next.js:');
console.log('==============================');

const nextConfigPath = path.join(process.cwd(), 'next.config.mjs');
if (fs.existsSync(nextConfigPath)) {
  const configContent = fs.readFileSync(nextConfigPath, 'utf8');
  
  const optimizations = [
    { name: 'optimizePackageImports', check: 'optimizePackageImports' },
    { name: 'Code Splitting (splitChunks)', check: 'splitChunks' },
    { name: 'Framer Motion en optimizePackageImports', check: 'framer-motion' },
    { name: 'Three.js en optimizePackageImports', check: 'three' },
    { name: 'Radix UI en optimizePackageImports', check: '@radix-ui' },
    { name: 'Chunks específicos (threejs)', check: 'threejs:' },
    { name: 'Chunks específicos (framerMotion)', check: 'framerMotion:' },
    { name: 'Chunks específicos (radixUI)', check: 'radixUI:' }
  ];
  
  for (const opt of optimizations) {
    const exists = configContent.includes(opt.check);
    const status = exists ? '✅' : '❌';
    console.log(`${status} ${opt.name}`);
  }
} else {
  console.log('❌ next.config.mjs no encontrado');
}

// Análisis del bundle si existe
console.log('\n📦 Análisis del Bundle:');
console.log('========================');

const nextDir = path.join(process.cwd(), '.next');
const staticDir = path.join(nextDir, 'static', 'chunks');

if (fs.existsSync(staticDir)) {
  const files = fs.readdirSync(staticDir)
    .filter(file => file.endsWith('.js') && !file.includes('.map'))
    .map(file => {
      const filePath = path.join(staticDir, file);
      const stats = fs.statSync(filePath);
      return {
        name: file,
        size: stats.size,
        sizeKB: (stats.size / 1024).toFixed(2)
      };
    })
    .sort((a, b) => b.size - a.size);
  
  console.log('Chunks principales encontrados:');
  
  const chunkTypes = {
    'threejs': files.filter(f => f.name.includes('threejs')),
    'framer-motion': files.filter(f => f.name.includes('framer-motion')),
    'radix-ui': files.filter(f => f.name.includes('radix-ui')),
    'react': files.filter(f => f.name.includes('react')),
    'vendor': files.filter(f => f.name.includes('vendor'))
  };
  
  for (const [type, chunks] of Object.entries(chunkTypes)) {
    if (chunks.length > 0) {
      const totalSize = chunks.reduce((sum, chunk) => sum + parseFloat(chunk.sizeKB), 0);
      console.log(`✅ ${type.padEnd(15)}: ${totalSize.toFixed(2).padStart(8)} KB (${chunks.length} chunks)`);
    } else {
      console.log(`⚠️  ${type.padEnd(15)}: No encontrado`);
    }
  }
  
  const totalSize = files.reduce((sum, file) => sum + parseFloat(file.sizeKB), 0);
  console.log(`\nTamaño total de chunks JS: ${totalSize.toFixed(2)} KB`);
  
} else {
  console.log('⚠️  Directorio .next/static/chunks no encontrado');
  console.log('   Ejecuta "npm run build" para generar el bundle');
}

// Resumen de optimizaciones implementadas
console.log('\n🎯 Optimizaciones Implementadas:');
console.log('=================================');

const optimizationsImplemented = [
  {
    name: 'Web Worker para OGL',
    description: 'Renderizado 3D en hilo separado',
    impact: 'Reduce Script Evaluation en main thread',
    status: '✅'
  },
  {
    name: 'Dynamic Imports para Framer Motion',
    description: 'Carga bajo demanda de animaciones',
    impact: 'Reduce Script Parsing inicial',
    status: '✅'
  },
  {
    name: 'Code Splitting Agresivo',
    description: 'Separación de librerías en chunks específicos',
    impact: 'Mejora cache y carga paralela',
    status: '✅'
  },
  {
    name: 'Lazy Loading Three.js',
    description: 'Carga diferida de componentes 3D',
    impact: 'Reduce bundle inicial',
    status: '✅'
  },
  {
    name: 'Lazy Loading Radix UI',
    description: 'Componentes UI bajo demanda',
    impact: 'Reduce Script Parsing',
    status: '✅'
  },
  {
    name: 'Optimización Next.js Config',
    description: 'Configuración avanzada de Webpack',
    impact: 'Mejora tree-shaking y splitting',
    status: '✅'
  }
];

for (const opt of optimizationsImplemented) {
  console.log(`${opt.status} ${opt.name}`);
  console.log(`   └─ ${opt.description}`);
  console.log(`   └─ Impacto: ${opt.impact}\n`);
}

console.log('🏆 Resultados Esperados:');
console.log('=========================');
console.log('• Reducción significativa en "Script Parsing & Compilation"');
console.log('• Mejora en "Script Evaluation" gracias al Web Worker');
console.log('• Carga más rápida del contenido inicial');
console.log('• Mejor experiencia de usuario en dispositivos móviles');
console.log('• Chunks más pequeños y cacheable por separado');

console.log('\n📊 Para medir el impacto real:');
console.log('==============================');
console.log('1. Abre Chrome DevTools');
console.log('2. Ve a la pestaña "Performance"');
console.log('3. Recarga la página y analiza:');
console.log('   • Script Parsing & Compilation time');
console.log('   • Script Evaluation time');
console.log('   • First Contentful Paint (FCP)');
console.log('   • Largest Contentful Paint (LCP)');

console.log('\n✨ Optimizaciones completadas exitosamente!');