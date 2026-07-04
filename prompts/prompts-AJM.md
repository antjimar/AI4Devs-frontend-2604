# Prompts del ejercicio — Tablero kanban de candidatos (AJM)

Registro de los prompts y del flujo de trabajo seguido para implementar la vista de
detalle de una posición como tablero kanban, siguiendo un flujo de **Spec-Driven
Development (SDD)** con [OpenSpec](https://github.com/Fission-AI/OpenSpec) y Claude Code.

> Nota metodológica: en lugar de "vibe coding", el desarrollo se estructuró en fases
> (arrancar → historia de usuario → spec → revisión adversarial → implementación →
> verificación E2E). Los prompts de abajo son representativos de cada fase; el asistente
> ejecutó y verificó cada paso por sí mismo (curl + Playwright MCP), sin delegar pruebas.

## 0. Preparación y verificación de la API real

> Antes de nada, arranca la aplicación (backend, frontend, base de datos) y verifica con
> `curl` la forma REAL de los endpoints de la posición. El enunciado documenta rutas y
> campos que podrían no coincidir con el backend; confía en lo que devuelve el servidor.

Hallazgo clave: el enunciado y el backend **no coinciden**. Rutas reales verificadas:

- `GET /position/:id/interviewflow` (singular, minúsculas; respuesta doble-anidada)
- `GET /position/:id/candidates` (singular)
- `PUT /candidates/:candidateId` con body `{ applicationId, currentInterviewStep: <stepId> }`

## 1. Historia de usuario

> Crea una historia de usuario en formato ágil (Como/Quiero/Para + criterios de aceptación
> en Gherkin) para el tablero kanban, en una carpeta `user-stories/`. Básala en la API real
> verificada, no en el enunciado. Documenta la discrepancia.

Resultado: `user-stories/US-01-kanban-candidatos-posicion.md` con 7 criterios de aceptación.

## 2. Infraestructura SDD (solo Claude)

> Monta una infraestructura de SDD para este proyecto, solo para Claude Code: un `CLAUDE.md`
> con los principios y la política de idioma, un agente `frontend-developer` y skills
> reutilizables (`adversarial-review`, `commit`) en `ai-specs/`, expuestas a `.claude/` con
> symlinks relativos. Instala y configura OpenSpec apuntando `openspec/config.yaml` a nuestro
> contexto real (stack, API, estándares).

## 3. Generación de artefactos OpenSpec

> /opsx:propose implementar el tablero kanban de candidatos según
> user-stories/US-01-kanban-candidatos-posicion.md

Genera `proposal.md`, `specs/candidate-kanban/spec.md`, `design.md` y `tasks.md`.
Reglas aplicadas: frontend-only, API real verificada, specs en inglés, y en `tasks.md` que
el agente verifique por sí mismo (curl + Playwright), empezando por la rama de feature.

## 4. Revisión adversarial de los artefactos (antes de codificar)

> /adversarial-review

Revisión red-team de los artefactos (spec vs design vs tasks vs historia). Detectó y se
corrigieron 8 hallazgos antes de escribir código, entre ellos 4 "Major":

- Título fallback cuando la posición no tiene interview flow.
- Columnas/movimientos keyed por id de fase (no por nombre) para evitar colisiones de nombre.
- Candidato en fase desconocida: agruparlo en "Unknown phase", nunca descartarlo en silencio.
- Cómo forzar el fallo del PUT para probar el revert (interceptar la request en Playwright).

## 5. Implementación

> /opsx:apply

Implementación tarea a tarea, con el detalle importante de decisiones ya fijadas en el
`design.md`: service layer con `fetch`, mapeo nombre→id de fases, `@dnd-kit/core` con
`pointerWithin`, actualización optimista con reversión en error, y layout responsive.

Prompts de apoyo representativos durante la implementación:

> Crea el service layer (`positionService.ts`) que desanide la respuesta doble del
> interviewflow y ordene las fases por `orderIndex` y luego por `id`.

Y para el tablero:

> Implementa el drag & drop con `@dnd-kit`: columnas droppables por id de fase, tarjetas
> arrastrables, y al soltar actualiza de forma optimista y revierte si el PUT falla.

## 6. Verificación E2E (ejecutada por el agente)

> Verifica la feature con Playwright MCP: renderizado de columnas y tarjetas, navegación,
> arrastrar una tarjeta y confirmar persistencia, forzar el fallo del PUT y confirmar la
> reversión, comprobar los no-op y el layout móvil. Restaura el estado de la BD al terminar.

Hallazgo durante el E2E: `dragTo` de Playwright no dispara de forma fiable el sensor de
dnd-kit; hay que mover el ratón por pasos. Además, cambiar la detección de colisiones a
`pointerWithin` hizo los drops predecibles. Ambos quedaron documentados en
`docs/frontend-standards.md`.

Todos los criterios de aceptación (CA-1…CA-7) verificados contra el comportamiento observado.

## 7. Revisión adversarial del código (después de implementar)

> /adversarial-review

Segunda pasada red-team, esta vez sobre el **código implementado** (la primera fue sobre
los artefactos). Intención explícita: intentar romper la propia implementación, no confirmar
el happy path. Encontró un bug real de concurrencia (Major) además de varios menores:

- **Major — clobbering en la reversión concurrente:** el revert restauraba un *snapshot del
  array completo* de candidatos. Si se movían dos tarjetas casi a la vez y la primera fallaba,
  su snapshot (previo al segundo movimiento) borraba el movimiento exitoso de la segunda.
- Menores: colisión de nombres de fase (asunción documentada), sin botón de reintento en el
  estado de error, drag por teclado no verificado, `moveError` persistente tras un no-op.

Fix aplicado (fiel al `design.md`, que se actualizó — D6):

> Aplica el fix: revierte solo el candidato afectado con una actualización funcional
> (`prev => prev.map(...)`), capturando su fase previa, en lugar de restaurar el array
> completo. Limpia el error al iniciar cualquier arrastre (`onDragStart`).

Re-verificación con Playwright MCP, incluyendo una **prueba de regresión de concurrencia**:
mover A (con su PUT retenido y luego fallido) mientras se mueve B (que persiste); se confirmó
que al revertir A, el movimiento de B **sobrevive** (antes se habría perdido). Estado de la BD
restaurado al terminar.

## 8. Ajuste por prueba manual (feedback de usuario)

Al navegar manualmente a una posición cuyo interview flow **no tiene fases** (Data Scientist),
el candidato aparecía en una única columna "Unknown phase", lo cual resultaba confuso.

> Cuando una posición no tiene fases configuradas pero sí tiene candidatos, muestra un mensaje
> claro ("no hay fases configuradas") y lista los candidatos en modo solo lectura, en vez de un
> tablero con una sola columna "Unknown phase".

Cambio aplicado: se extrajo un componente presentacional `CandidateCardView` (compartido por la
tarjeta arrastrable y la lista de solo lectura) y se separó el caso "sin fases" (mensaje + lista)
del caso "columna vacía dentro de un tablero". Se actualizaron los specs (principal y archivado) y
el diseño (D8), y se re-verificó con Playwright: la posición sin fases muestra el mensaje + lista,
y el tablero con fases sigue renderizando y permitiendo el arrastre. Nota de proceso: el cambio ya
estaba archivado, así que se actualizó el spec vigente en `openspec/specs/` (la fuente de verdad).

## 9. Cierre

> /commit  (rama de feature + pull request)
