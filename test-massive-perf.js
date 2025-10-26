// Script de prueba para rendimiento masivo
const testPermissions = Array.from({ length: 100 }, (_, i) => 
  `PL/${2000 + i}/EXP/ES/2015`
);

console.log('🚀 Probando verificación masiva con 100 permisos...');

console.log('Permisos de prueba:');
console.log(testPermissions.slice(0, 10).join(', '), '...');

import fetch from 'node-fetch';

async function testMassivePerformance() {
  try {
    console.log('\n📊 Iniciando prueba de rendimiento...');
    const startTime = Date.now();
    
    const response = await fetch('http://localhost:3001/api/verify-massive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ permits: testPermissions })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    const totalTime = (Date.now() - startTime) / 1000;
    
    console.log('✅ Prueba completada exitosamente!');
    console.log(`\n📈 RESULTADOS DE RENDIMIENTO:`);
    console.log(`Total permisos: ${data.total}`);
    console.log(`Tiempo total: ${totalTime.toFixed(2)} segundos`);
    console.log(`Tiempo promedio por permiso: ${(totalTime / data.total).toFixed(3)} segundos`);
    console.log(`Lotes procesados: ${data.lotesProcesados}`);
    console.log(`Cache hit rate: ${data.cacheHitRate}`);
    
    if (data.estadisticas) {
      console.log(`\n📊 ESTADÍSTICAS:`);
      console.log(`✅ Vigentes: ${data.estadisticas.vigentes}`);
      console.log(`❌ No vigentes: ${data.estadisticas.no_vigentes}`);
      console.log(`❓ No encontrados: ${data.estadisticas.no_encontrados}`);
      console.log(`⚠️ Errores: ${data.estadisticas.errores}`);
    }
    
    // Calcular estimación para 4,000 permisos
    const tiempoEstimado4000 = (totalTime / 100) * 4000;
    console.log(`\n🎯 ESTIMACIÓN PARA 4,000 PERMISOS:`);
    console.log(`Tiempo estimado: ${(tiempoEstimado4000 / 60).toFixed(1)} minutos (${tiempoEstimado4000.toFixed(0)} segundos)`);
    console.log(`Mejora vs configuración anterior: ${(22 * 60 / tiempoEstimado4000).toFixed(1)}x más rápido`);
    
    return data;
    
  } catch (error) {
    console.error('❌ Error en prueba masiva:', error);
  }
}

// Ejecutar la prueba
testMassivePerformance();