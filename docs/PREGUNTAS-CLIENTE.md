# Preguntas abiertas para el cliente

Surgen de cruzar el Plan de Desarrollo v1.0, las respuestas del 08/10/2026 y el Excel de referencia. Se ordenan por impacto: las primeras bloquean el modelo de datos.

## Bloqueantes para el modelo de datos

**P1. Acompañante.** La tabla dice que son *"todos los deportistas que no cumplen con algún documento obligatorio"*.
- ¿Un deportista sin documentos pasa **automáticamente** a credencial de Acompañante, o lo decide un usuario?
- ¿Desde qué momento se aplica (fecha de corte)?
- Si después completa sus documentos, ¿vuelve a ser Deportista?
- Un Acompañante, ¿necesita algún documento (p. ej. DNI y foto) para imprimirse?

**P2. Condiciones del Excel frente a los tipos de participante.** El Excel usa estas condiciones:

| Condición en el Excel | Cantidad |
|---|---|
| DEPORTISTA | 1.971 |
| ENTRENADOR / DELEGADO | 597 |
| COORDINADOR DE DELEGACIÓN | 35 |
| DELEGADO | 84 |
| ENTRENADOR | 84 |
| EMPRENDEDOR / EMPRESARIO | — |

¿A qué tipo corresponde "Entrenador / Delegado" (una persona con los dos roles): Delegado o Entrenador? ¿Y "Coordinador de delegación"?

**P3. Paradeportistas.** ¿Son Deportistas con discapacidad o un tipo aparte? ¿El **certificado de discapacidad** es obligatorio para ellos? En la tabla no aparece marcado para nadie.

**P4. Requisitos de Delegado y Entrenador.** La tabla pide Resolución Directoral + DNI + Foto al Delegado, y Resolución Directoral + DNI al Entrenador. Pero el Excel anterior consideraba "lista" la credencial docente con Resolución Directoral + DNI + **Documento de designación**, sin foto.
- ¿Cuál es la regla 2026?
- ¿El Entrenador no lleva foto en la credencial?
- ¿Cuándo aplican la autorización notarial y los anexos 2, 3 y 6? (Existen en el Excel, pero no están marcados como obligatorios.)

## Credencial y QR

**P5. Qué muestra el QR.** Debe mostrar el estado de la documentación. Si lo escanea alguien **sin iniciar sesión** (p. ej. personal de puerta), ¿qué puede ver? Propuesta: nombre, tipo, delegación y "Habilitado / No habilitado", sin detalle de documentos de salud. El detalle completo solo para usuarios autenticados.

**P6. Duplicados.**
- ¿Se requiere un motivo (pérdida, error de impresión…)?
- ¿Quién puede autorizarlos?
- ¿El duplicado invalida el QR del ejemplar anterior?

**P7. Impresión.**
- ¿Se imprime anverso y reverso (QR) en la misma impresora y pasada?
- ¿Qué modelo exacto de impresora se usará? Necesitamos hacer una prueba de calibración con una hoja real antes de producción.
- ¿Se registra el lugar de impresión? (El Excel lo hacía: IE Melitón Carvajal / Oficina Mateus.)
- Necesitamos los **artes 2026** de los 8 tipos.
- ¿Qué tipos regulares tienen acceso total o parcial?

**P8. Diplomas.** No estaban en el plan original.
- ¿Qué datos se imprimen y en qué medida de papel?
- ¿Para qué tipos de participante?
- ¿Se registra quién y cuándo lo imprimió?
- ¿Esto amplía el cronograma acordado?

## Seguridad y datos

**P9. Contraseñas en el Excel.** El archivo compartido contiene las columnas USUARIO y PASSWORD de unos 2.700 participantes en texto plano. Recomendamos:
- dejar de circular ese archivo;
- cambiar esas contraseñas en el sistema Mateus;
- que el padrón 2026 se envíe **sin** esas columnas.

El sistema no las importará.

**P10. Datos sensibles en Cloudinary.** Los certificados médicos y de discapacidad de menores son datos sensibles (Ley 29733). ¿El MINEDU autoriza su almacenamiento en Cloudinary (servidores fuera del Perú)? ¿El consentimiento de los anexos lo cubre? ¿Cuánto tiempo deben conservarse tras el evento?

## Operación

**P11. Padrón 2026.**
- ¿Llega en el mismo formato que la hoja *LISTA LIMPIA*?
- ¿Habrá cargas parciales sucesivas (por macrorregión)?
- Si un participante ya existe, ¿se actualiza o se omite?

**P12. Delegaciones.**
- "Una delegación tiene participantes, *entregador* y delegado": ¿"entregador" significa entrenador?
- ¿Hay delegaciones mixtas, además de damas (D) y varones (V)?
- ¿Cuál es la abreviatura "PAT" y la lista oficial de disciplinas 2026?
- ¿Cuáles son las sedes de las 8 macrorregiones?

**P13. Permisos no indicados.** Proponemos lo siguiente; ¿lo confirman?
- **Registrar entregas:** los tres roles.
- **Activar/desactivar participantes y gestionar usuarios y catálogos:** solo Administrador.
- **Importar Excel:** Administrador y Coordinador.

**P14. Infraestructura.** ¿Desde qué fecha cuenta el mes de soporte y hosting incluido? ¿Qué pasa después?
