# US-01 — Tablero kanban de candidatos de una posición

> **Estado:** Propuesta · **Épica:** Gestión del proceso de contratación · **Prioridad:** Alta
> **Fecha límite del ejercicio:** domingo 05 de julio

## Historia de usuario

**Como** reclutador/a de LTI,
**quiero** ver los candidatos de una posición concreta organizados en un tablero kanban por fase del proceso de contratación, y poder mover cada candidato de fase arrastrando su tarjeta,
**para** visualizar de un vistazo en qué punto del proceso está cada persona y actualizar su fase de forma rápida sin formularios.

## Contexto

La aplicación ya dispone de una página `/positions` que lista las posiciones en tarjetas con filtros. Cada tarjeta tiene un botón **"Ver proceso"** que actualmente **no navega a ningún sitio**. Esta historia cubre la creación de la vista de detalle de una posición (llamada *position*) a la que ese botón debe llevar, materializada como un tablero kanban.

El alcance es **solo frontend**: se consume la API que el equipo de backend ya expone (ver [Contrato de API real](#contrato-de-api-real)). No se modifica el backend.

## Criterios de aceptación

### CA-1: Navegación desde el listado al detalle

```gherkin
Escenario: Abrir el proceso de una posición
  Dado que estoy en la página de listado de posiciones "/positions"
  Cuando pulso el botón "Ver proceso" de una posición
  Entonces navego a la vista de detalle de esa posición (ruta "/positions/:id")
  Y se carga el tablero kanban de esa posición
```

### CA-2: Encabezado con título y navegación de vuelta

```gherkin
Escenario: Cabecera de la vista de detalle
  Dado que estoy en la vista de detalle de una posición
  Entonces veo el título de la posición en la parte superior
  Y veo una flecha "atrás" a la izquierda del título
  Cuando pulso la flecha "atrás"
  Entonces vuelvo al listado de posiciones "/positions"
```

### CA-3: Columnas = fases del proceso

```gherkin
Escenario: Renderizado de columnas por fase
  Dado que la posición tiene definidas N fases en su interview flow
  Cuando se carga el tablero
  Entonces se muestran exactamente N columnas, una por fase
  Y cada columna muestra el nombre de la fase como cabecera
  Y las columnas se ordenan según el orden del proceso
```

> **Nota técnica de ordenación:** el campo `orderIndex` del backend no es fiable como orden único (en los datos sembrados dos fases comparten `orderIndex: 2`). Se ordenará por `orderIndex` y, en caso de empate, por `id` ascendente como desempate estable.

### CA-4: Tarjetas de candidato en su fase

```gherkin
Escenario: Ubicación y contenido de las tarjetas
  Dado que la posición tiene candidatos en distintas fases
  Cuando se carga el tablero
  Entonces cada candidato aparece como una tarjeta en la columna de su fase actual
  Y cada tarjeta muestra el nombre completo del candidato
  Y cada tarjeta muestra su puntuación media
```

### CA-5: Mover un candidato de fase (drag & drop)

```gherkin
Escenario: Arrastrar una tarjeta a otra columna con éxito
  Dado que veo una tarjeta de candidato en una columna
  Cuando arrastro la tarjeta y la suelto en otra columna
  Entonces la tarjeta se muestra inmediatamente en la nueva columna (feedback optimista)
  Y se envía al backend la actualización de la fase del candidato
  Y si el backend confirma, el cambio permanece
```

```gherkin
Escenario: Error al actualizar la fase en el backend
  Dado que arrastro una tarjeta a otra columna
  Cuando la llamada al backend falla
  Entonces la tarjeta vuelve a su columna original
  Y se informa al usuario del error de forma no intrusiva
```

### CA-6: Responsividad móvil

```gherkin
Escenario: Vista en móvil
  Dado que abro el tablero en una pantalla estrecha (móvil)
  Entonces las fases se muestran en vertical, cada una ocupando todo el ancho
  Y puedo desplazarme para ver todas las fases y candidatos
```

### CA-7: Estados de carga y vacío

```gherkin
Escenario: Carga de datos
  Cuando entro en la vista de detalle
  Entonces veo un indicador de carga mientras se obtienen los datos

Escenario: Posición sin fases o sin candidatos
  Dado que una posición no tiene fases definidas (o una columna no tiene candidatos)
  Entonces el tablero se muestra sin errores
  Y las columnas vacías se representan claramente como vacías
```

## Contrato de API real

> ⚠️ **Importante:** el enunciado del ejercicio documenta unas rutas/campos que **no coinciden** con el backend real. Esta historia se basa en la API **verificada en vivo** (curl contra `localhost:3010`), no en el enunciado. Se documenta la discrepancia por transparencia.

Base URL: `http://localhost:3010`

### 1. Obtener las fases del proceso

`GET /position/:id/interviewflow` *(singular, en minúsculas)*

Respuesta (**doble anidamiento** — atención a la estructura):

```json
{
  "interviewFlow": {
    "positionName": "Senior Full-Stack Engineer",
    "interviewFlow": {
      "id": 1,
      "description": "Standard development interview process",
      "interviewSteps": [
        { "id": 1, "interviewFlowId": 1, "interviewTypeId": 1, "name": "Initial Screening", "orderIndex": 1 },
        { "id": 2, "interviewFlowId": 1, "interviewTypeId": 2, "name": "Technical Interview", "orderIndex": 2 },
        { "id": 3, "interviewFlowId": 1, "interviewTypeId": 3, "name": "Manager Interview", "orderIndex": 2 }
      ]
    }
  }
}
```

- El título de la posición está en `interviewFlow.positionName`.
- Las fases están en `interviewFlow.interviewFlow.interviewSteps`.

### 2. Obtener los candidatos de la posición

`GET /position/:id/candidates` *(singular)*

Respuesta (array):

```json
[
  { "fullName": "John Doe",      "currentInterviewStep": "Technical Interview", "averageScore": 5, "id": 1, "applicationId": 1 },
  { "fullName": "Jane Smith",    "currentInterviewStep": "Technical Interview", "averageScore": 4, "id": 2, "applicationId": 3 },
  { "fullName": "Carlos García", "currentInterviewStep": "Initial Screening",   "averageScore": 0, "id": 3, "applicationId": 4 }
]
```

- `currentInterviewStep` es el **nombre** de la fase (string), no su id.
- `id` es el `candidateId`; `applicationId` es el id de la aplicación (necesario para el PUT).

### 3. Actualizar la fase de un candidato

`PUT /candidates/:candidateId` *(sin sufijo `/stage`)*

Body:

```json
{ "applicationId": 4, "currentInterviewStep": 2 }
```

- `currentInterviewStep` en el body es el **id numérico** de la fase destino (no el nombre).
- Respuesta de éxito: `{ "message": "Candidate stage updated successfully", "data": { ... "currentInterviewStep": 2 ... } }`.

## Consideraciones técnicas de implementación

- **Mapeo nombre → id:** las tarjetas llegan con la fase como nombre (`currentInterviewStep` string), pero el PUT exige el id numérico. Hay que construir un mapa `nombre → id` a partir de `interviewSteps` para: (a) colocar cada tarjeta en su columna y (b) resolver el id de la columna destino al soltar.
- **Drag & drop:** se usará `@dnd-kit/core` (compatible con React 18, accesible, mantenido). No hay ninguna librería DnD instalada actualmente.
- **Punto de enganche de navegación:** `frontend/src/components/Positions.tsx` (botón "Ver proceso" sin acción) y `frontend/src/App.js` (añadir la ruta `/positions/:id`). Nota: el punto de entrada real es `App.js`, no `App.tsx` (este último es boilerplate muerto de CRA).
- **Stack:** React 18 + TypeScript + React Bootstrap + react-router-dom v6 (ya presentes en el proyecto). El nuevo componente kanban se creará en TypeScript (`.tsx`).
- **Llamadas HTTP:** `axios` se importa en el código existente pero **no está instalado**; se usará `fetch` (nativo) para evitar añadir dependencia, salvo que se decida instalar axios.

## Fuera de alcance

- Modificar el backend o sus endpoints.
- Filtros o búsqueda dentro del tablero.
- Ver/editar el detalle completo de un candidato (CV, entrevistas individuales).
- Autenticación/autorización.
- Conectar el listado `/positions` a la API real (hoy usa datos mock); solo se engancha la navegación del botón.

## Definición de terminado (DoD)

- [ ] Todos los criterios de aceptación (CA-1 a CA-7) verificables manualmente en la posición 1 (Senior Full-Stack Engineer, la que tiene 3 candidatos y 3 fases sembradas).
- [ ] El tablero funciona en escritorio y en móvil (fases en vertical).
- [ ] El drag & drop actualiza el backend y revierte en caso de error.
- [ ] Sin errores en consola del navegador.
- [ ] Prompts documentados en `prompts/prompts-AJM.md` para la entrega.
