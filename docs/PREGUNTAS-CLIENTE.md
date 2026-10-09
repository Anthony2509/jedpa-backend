# Sistema de credenciales JEDPA 2026 — Consultas pendientes

**Para:** Organización de los Juegos Escolares Deportivos y Paradeportivos
**De:** Equipo de desarrollo
**Fecha:** 9 de octubre de 2026

Gracias por las respuestas anteriores: con ellas ya están funcionando el registro de participantes, la carga y revisión de documentos, la impresión de credenciales con QR y la importación del padrón.

Para cerrar el sistema necesitamos confirmar los puntos siguientes. En cada uno indicamos **qué hace hoy el sistema** (una propuesta nuestra) para que, si están de acuerdo, solo marquen **"Confirmo"**; si no, escriban la corrección.

> **Prioridad:** las preguntas marcadas con 🔴 detienen el avance o impiden importar participantes. Les agradeceremos responderlas primero.

---

## 1. Tipos de participante y documentos

### 🔴 1.1 Acompañante
Su tabla indica que son *"todos los deportistas que no cumplen con algún documento obligatorio"*.

- ¿El cambio de Deportista a Acompañante lo hace **el sistema automáticamente** o **una persona** lo decide caso por caso?
- ¿Desde qué fecha se aplica (fecha de corte)?
- Si después completa sus documentos, ¿vuelve a ser Deportista?
- ¿El Acompañante debe presentar algún documento (por ejemplo DNI y foto)?

**Hoy el sistema:** el Acompañante se registra manualmente y no exige documentos.

Respuesta: ______________________________________________

### 🔴 1.2 Condiciones del Excel sin tipo de credencial
En el Excel aparecen estas condiciones que no coinciden con los 8 tipos de credencial:

| Condición en el Excel | Personas |
|---|---|
| ENTRENADOR / DELEGADO | 597 |
| COORDINADOR DE DELEGACIÓN | 35 |

¿Qué credencial corresponde a cada una (Entrenador, Delegado u otra)?

**Hoy el sistema:** no las importa hasta tener su respuesta (son 632 personas).

Respuesta: ______________________________________________

### 1.3 Paradeportistas
- ¿Son Deportistas con discapacidad, o un tipo de credencial distinto?
- ¿El **certificado de discapacidad** es obligatorio para ellos? En la tabla de documentos no aparece marcado para ningún perfil.

**Hoy el sistema:** son Deportistas; el certificado de discapacidad se puede cargar, pero no es obligatorio.

Respuesta: ______________________________________________

### 🔴 1.4 Documentos de Delegado y Entrenador
Su tabla pide:
- **Delegado:** Resolución Directoral, DNI y Foto.
- **Entrenador:** Resolución Directoral y DNI (sin foto).

Sin embargo, en el Excel del año anterior la credencial "Docente" se habilitaba con Resolución Directoral, DNI y **Documento de designación**.

- ¿Cuál es la regla para 2026?
- ¿El Entrenador **no** lleva foto en su credencial?
- ¿Cuándo son obligatorios la autorización notarial y los anexos 2, 3 y 6?

**Hoy el sistema:** aplica su tabla tal cual. Las reglas se cambian sin reprogramar, solo necesitamos su confirmación.

Respuesta: ______________________________________________

### 1.5 Foto de las credenciales especiales
Las credenciales de MINEDU, Invitado y Proveedores no requieren documentos, pero el arte lleva foto.

- ¿Quién envía esas fotos y por qué medio?

**Hoy el sistema:** se pueden imprimir sin foto (el recuadro queda en blanco) o cargarla si se tiene.

Respuesta: ______________________________________________

### 1.6 Archivos de los documentos
Cada participante tendrá sus documentos digitalizados en el sistema (unos 2.700 participantes × hasta 5 documentos).

- ¿Ya tienen los documentos en formato digital? ¿Quién los cargará (su equipo, cada delegación)?
- ¿Están de acuerdo con estos formatos y límites? **PDF, JPG o PNG de hasta 5 MB por archivo; la foto solo JPG o PNG.**

Respuesta: ______________________________________________

---

## 2. Padrón en Excel

### 🔴 2.1 Disciplina "PAT"
En el Excel aparece la abreviatura **PAT** (179 personas) y no sabemos a qué disciplina corresponde. Por favor, compártannos además la **lista oficial de disciplinas 2026** con su abreviatura.

**Hoy el sistema** reconoce: AJD Ajedrez, ATL Atletismo, BSQ Básquet, FTB Fútbol, FTS Futsal, HAN Handball, JUD Judo, NAT Natación, TNM Tenis de mesa y VOL Vóley.

Respuesta: ______________________________________________

### 2.2 Padrón 2026
- ¿Llegará con el **mismo formato** que la hoja *LISTA LIMPIA*?
- ¿Será un solo archivo o **cargas parciales** (por ejemplo, por macrorregión)?
- Si una persona ya está registrada en el sistema, ¿se **actualizan** sus datos o se **mantienen** los que ya tiene?

**Hoy el sistema:** si la persona ya existe, se mantienen sus datos y no se sobrescriben.

Respuesta: ______________________________________________

### 2.3 Datos del Excel que necesitan corrección
Al revisar el Excel de referencia encontramos filas que el sistema no puede importar tal como están:

| Situación | Filas |
|---|---|
| Fecha de nacimiento vacía o inválida | 13 |
| Carné de extranjería con formato incorrecto | 11 |
| Filas sin categoría ni género de delegación (con "0") | 9 |
| Documento repetido dentro del mismo archivo | 8 |

No hace falta corregir el archivo del año pasado; les pedimos que **el padrón 2026 llegue sin estos casos**. El sistema les mostrará la fila exacta de cada problema antes de importar.

Comentario: ______________________________________________

### 🔴 2.4 Usuarios y contraseñas en el Excel
El archivo compartido contiene las columnas **USUARIO** y **PASSWORD** de unas 2.700 personas, en texto visible. Por seguridad, y por tratarse en su mayoría de menores de edad, les recomendamos:

1. Dejar de compartir ese archivo.
2. Cambiar esas contraseñas en el sistema de inscripción.
3. Enviar el padrón 2026 **sin** esas columnas.

Nuestro sistema **nunca lee ni guarda** esas columnas.

Confirmo que se tomarán estas medidas: ☐ Sí ☐ No

---

## 3. Delegaciones y macrorregiones

### 3.1 Integrantes de la delegación
Indicaron que *"una delegación tiene participantes, entregador y delegado"*. ¿"Entregador" se refiere al **entrenador**?

Respuesta: ______________________________________________

### 3.2 Delegaciones mixtas
¿Existen delegaciones **mixtas**, además de damas (D) y varones (V)?

Respuesta: ______________________________________________

### 3.3 Las 8 macrorregiones
Por favor, compártannos el **nombre y la sede** de cada macrorregión 2026 (M1 a M8).

Respuesta: ______________________________________________

---

## 4. Credencial, impresión y QR

### 🔴 4.1 Artes 2026
Necesitamos los **artes de los 8 tipos de credencial** (anverso y reverso) para ajustar la posición exacta de los datos. Hoy usamos las medidas de la credencial del año anterior (120 × 155 mm).

- ¿Qué tipos regulares (Deportista, Acompañante, Delegado, Entrenador) son de **acceso total** y cuáles de **acceso parcial**?

Respuesta: ______________________________________________

### 4.2 Impresora y prueba
- ¿Qué **modelo exacto** de impresora se usará?
- ¿Anverso y reverso se imprimen en la **misma pasada**?
- ¿Podemos coordinar una **prueba de impresión** con cartulinas reales antes del evento? El sistema genera una hoja de prueba para calibrar en papel común.

Respuesta: ______________________________________________

### 4.3 Lugar de impresión
El Excel anterior registraba dónde se imprimió cada credencial (IE Melitón Carvajal / Oficina Mateus). ¿Debemos registrarlo también?

**Hoy el sistema** registra quién imprimió, cuándo y qué ejemplar, pero no el lugar.

Respuesta: ______________________________________________

### 4.4 Duplicados
- ¿Se debe indicar el **motivo** (pérdida, deterioro, error de impresión)?
- ¿Quién puede autorizar un duplicado?
- Al imprimir un duplicado, ¿la credencial anterior debe **dejar de ser válida**?

**Hoy el sistema:** exige un motivo; puede imprimirlo cualquier usuario con permiso de impresión; y el QR de la credencial anterior **deja de ser válido** (útil si se perdió). Máximo 3 duplicados por persona.

Confirmo: ☐ Respuesta: ______________________________________________

### 4.5 Qué muestra el QR
Al escanear el QR, por ejemplo en la puerta de una sede, **cualquier persona** ve:
- nombre, tipo de credencial, nivel de acceso y delegación;
- "Habilitado / No habilitado";
- el estado de cada documento obligatorio (aprobado, pendiente u observado), **sin** número de documento, foto ni archivos.

Una credencial reemplazada por un duplicado muestra "no válida", sin datos de la persona.

Confirmo: ☐ Respuesta: ______________________________________________

---

## 5. Entrega de credenciales

### 5.1 Quién registra la entrega
**Hoy el sistema** permite que los tres perfiles (Administrador, Coordinador y Operador) registren entregas. ¿Es correcto?

Confirmo: ☐ Respuesta: ______________________________________________

---

## 6. Diplomas

### 6.1 Impresión de diplomas
Este punto no estaba en el plan inicial.

- ¿Qué datos se imprimen en el diploma y en qué **medida de papel**?
- ¿Para qué tipos de participante?
- ¿Se debe registrar quién lo imprimió y cuándo?
- ¿Pueden compartirnos el diseño?

Como es una funcionalidad adicional, coordinaremos su impacto en el cronograma.

Respuesta: ______________________________________________

---

## 7. Permisos y seguridad

### 7.1 Permisos que no estaban especificados
Proponemos lo siguiente:

| Acción | Quién |
|---|---|
| Crear usuarios y editar catálogos (lugares de entrega, etc.) | Administrador |
| Activar o desactivar participantes | Administrador |
| Importar el padrón desde Excel | Administrador y Coordinador |
| Cargar la Resolución Directoral de una macrorregión | Administrador y Coordinador |

Confirmo: ☐ Respuesta: ______________________________________________

### 7.2 Datos sensibles y almacenamiento
Los certificados médicos y de discapacidad de menores son datos sensibles según la **Ley 29733**. El sistema los guarda de forma privada en Cloudinary (servidores fuera del Perú). Solo los ven usuarios autorizados, mediante enlaces que caducan en 60 segundos, y cada consulta queda registrada.

- ¿El MINEDU autoriza este almacenamiento? ¿El consentimiento de los anexos lo cubre?
- ¿Cuánto tiempo deben conservarse los documentos después del evento?

Respuesta: ______________________________________________

---

## 8. Servicio

### 8.1 Hosting y soporte
- ¿Desde qué fecha cuenta el **mes de hosting y soporte** incluido?
- ¿Qué sucede con el sistema y los datos al terminar ese mes?

Respuesta: ______________________________________________

---

**Gracias.** Pueden responder directamente en este documento o por correo indicando el número de cada punto (por ejemplo: *"1.2: Entrenador / Delegado es Entrenador"*).
