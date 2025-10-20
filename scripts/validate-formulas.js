#!/usr/bin/env node

/**
 * Script para validar las fórmulas en las variables de entorno
 * Ejecutar: node scripts/validate-formulas.js
 */

const fs = require('fs');
const path = require('path');

// Leer archivo .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

// Parsear variables de entorno básico
const envVars = {};
envContent.split('\n').forEach(line => {
  if (line.startsWith('FORMULA_') && line.includes('=')) {
    const [key, ...valueParts] = line.split('=');
    envVars[key] = valueParts.join('=');
  }
});

const formulaKeys = [
  'FORMULA_BACILLUS',
  'FORMULA_AZOTOBACTER', 
  'FORMULA_AZOSPIRILLUM',
  'FORMULA_PSEUDOMONAS',
  'FORMULA_SIRIUSBACTER_COMPLETA',
  'FORMULA_BASE'
];

console.log('🧪 Validando fórmulas en variables de entorno...\n');

let totalErrors = 0;

formulaKeys.forEach(key => {
  const envValue = envVars[key];
  
  if (!envValue) {
    console.log(`❌ ${key}: No encontrada en variables de entorno`);
    totalErrors++;
    return;
  }

  try {
    const parsed = JSON.parse(envValue);
    const components = Object.keys(parsed).length;
    console.log(`✅ ${key}: ${components} componentes`);
    
    // Validar estructura de cada componente
    for (const [nombre, datos] of Object.entries(parsed)) {
      if (!datos.cantidad || !datos.unidad || !datos.descripcion) {
        console.log(`   ⚠️  ${nombre}: Estructura incompleta`);
      }
    }
  } catch (error) {
    console.log(`❌ ${key}: Error de JSON - ${error.message}`);
    totalErrors++;
  }
});

if (totalErrors === 0) {
  console.log('\n🎉 Todas las fórmulas están correctamente configuradas!');
} else {
  console.log(`\n💥 ${totalErrors} errores encontrados en las fórmulas`);
  process.exit(1);
}