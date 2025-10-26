service cloud.firestore {
  match /databases/{database}/documents {
    // Cada cliente tiene su propio espacio
    match /clientes/{clienteId}/{document=**} {
      // Permitir acceso solo si el usuario está autenticado
      // y su UID coincide con el clienteId del documento
      allow read, write: if request.auth != null && request.auth.uid == clienteId;
    }
  }
}


## Problema Detectado

**Error Chrome Extension**: 
```
Unchecked runtime.lastError: The message port closed before a response was received.
```

**Error Firebase**:
```
FirebaseError: Missing or insufficient permissions.
```

## Solución Inmediata

### 1. Disable Chrome Extensions Problemáticas

El error "message port closed" es causado por extensiones de Chrome. Para resolverlo:

1. **Abrir Chrome en modo incógnito** (Ctrl+Shift+N)
2. **Deshabilitar extensiones** problemáticas:
   - Ve a `chrome://extensions/`
   - Desactiva extensiones una por una para identificar cuál causa el problema
   - Extensiones comunes problemáticas: Ad blockers, VPNs, desarrollador tools

### 2. Carga de XML Locales sin Firebase

El sistema ya está configurado para funcionar sin Firebase:

**Funciones que trabajan sin Firebase:**
- ✅ Verificación automática de permisos CRE
- ✅ Cálculos de IEPS
- ✅ Dashboard con métricas
- ✅ Reportes detallados
- ✅ Filtrado por meses

## Cómo Usar el Sistema Sin Firebase

### Paso 1: Cargar XML Manualmente
1. Ve a la pestaña **"Pagos Provisionales"**
2. En **"Carga de Archivos CFDI"**:
   - **Emitidos**: Carga tus XML de ingresos
   - **Recibidos**: Carga tus XML de deducciones
3. Los XML se procesarán localmente sin necesidad de Firebase

### Paso 2: Usar Funcionalidades de IEPS
1. Ve a la pestaña **"Litros x Cuota IEPS"**
2. El sistema detectará automáticamente los CFDI de diesel
3. La verificación de permisos CRE funciona localmente con el backend

### Paso 3: Generar Reportes
1. Los reportes y dashboard funcionan completamente offline
2. Los permisos verificados se guardan localmente durante la sesión
3. Puedes exportar reportes en PDF/CSV

## Configuración Firebase Opcional

Si quieres persistencia de datos entre sesiones:

### Firestore Rules (Coeficientes):
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### Realtime Database Rules (Permisos):
```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid"
      }
    }
  }
}
```

## Estado Actual del Sistema

### ✅ Funcionalidades que Funcionan Sin Firebase
- Verificación CRE automática ✅
- Cálculos IEPS ✅  
- Dashboard métricas ✅
- Reportes detallados ✅
- Filtrado por meses ✅
- Almacenamiento sesión actual ✅

### ⚠️ Funcionalidades que Requieren Firebase
- Persistencia entre sesiones ❌
- Historial de coeficientes ❌
- Permisos guardados permanentemente ❌

## Resolución de Problemas

### Si los XML no se cargan:
1. Verifica que los archivos sean XML válidos
2. Intenta cargarlos de uno en uno
3. Usa Chrome en modo incógnito

### Si no detecta CFDI de diesel:
1. Verifica que los XML contengan conceptos de diesel
2. Revisa en la pestaña "Litros x Cuota IEPS" que aparezcan los CFDI
3. Los CFDI deben estar vigentes (no cancelados)

### Para Forzar Carga Local:
El sistema automáticamente usa datos locales cuando detecta errores de Firebase. No se necesita configuración adicional.

## Próximos Pasos

1. **Configurar Firebase** (opcional para persistencia)
2. **Usar modo incógnito** para evitar errores de extensiones
3. **Cargar XML manualmente** en cada sesión si no se configura Firebase

El sistema está completamente funcional para cálculos y verificaciones sin necesidad de Firebase.