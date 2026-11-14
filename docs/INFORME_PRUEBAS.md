# Informe de pruebas — ColorLink (tienda Pintuco)

| Dato | Valor |
|---|---|
| Proyecto | ColorLink: aplicación web de venta de pinturas y servicios de pintura con chatbot de IA |
| Fecha de ejecución | 14 de noviembre de 2026 |
| Herramientas | Jest 30, Supertest 7, Playwright (pruebas de interfaz) |
| Entorno | Node.js 22, base de datos en memoria (`DB_PROVIDER=memory`) con los mismos datos semilla de Supabase |
| Comando | `npm test` / `npm run test:coverage` |

## 1. Resumen de resultados

| Indicador | Resultado |
|---|---|
| Suites de prueba | **6 / 6 aprobadas** |
| Casos de prueba | **48 / 48 aprobados (100 %)** |
| Cobertura de líneas | **97,3 %** |
| Cobertura de sentencias | 91,8 % |
| Cobertura de funciones | 90,4 % |
| Cobertura de ramas | 77,5 % |
| Tiempo total | ≈ 3 segundos |

## 2. Estrategia

1. **Pruebas unitarias.** Validan la lógica pura de la calculadora m² → galones.
2. **Pruebas de integración de la API.** Usan Supertest contra la aplicación Express completa (rutas, middleware de autenticación, validaciones y repositorio). Cada prueba crea una base de datos nueva para quedar aislada.
3. **Pruebas del chatbot.** La API de OpenAI se sustituye por un *mock* de `fetch`. Así se verifica el formato de la petición, el contexto enviado y el manejo de errores, sin gastar créditos ni depender de internet.
4. **Prueba funcional de extremo a extremo.** Un navegador automatizado (Playwright) recorre los tres roles. Las capturas están en `docs/img/`.

## 3. Casos de prueba

### 3.1 Calculadora de galones (`tests/calculadora.test.js`)

| ID | Caso | Entrada | Resultado esperado | Estado |
|---|---|---|---|---|
| CP-01 | Cálculo estándar | 50 m², 2 manos, rinde 40 m²/gal, 10 % desperdicio | 2,75 → **3 galones**, $294.000 | ✅ |
| CP-02 | Redondeo hacia arriba | 41 m², 1 mano, 40 m²/gal | 2 galones | ✅ |
| CP-03 | Valor exacto | 80 m², 1 mano, 40 m²/gal | 2 galones (no 3) | ✅ |
| CP-04 | Mínimo 1 galón | 1 m² | 1 galón | ✅ |
| CP-05 | Más manos, más pintura | 100 m², 1 vs 3 manos | 3 manos > 1 mano | ✅ |
| CP-06 | Entradas inválidas (8 variantes) | m² ≤ 0, texto, > 100.000; manos 0, 6, 1,5; rendimiento 0 | Error 400 con mensaje | ✅ |

### 3.2 Autenticación y roles (`tests/auth.test.js`)

| ID | Caso | Resultado esperado | Estado |
|---|---|---|---|
| CP-10 | Inicio de sesión correcto | 200, token JWT, sin `password_hash` | ✅ |
| CP-11 | Contraseña incorrecta | 401 | ✅ |
| CP-12 | Registro de cliente | 201, correo normalizado en minúsculas | ✅ |
| CP-13 | Correo duplicado | 409 | ✅ |
| CP-14 | Registrarse como admin | 400 (no permitido) | ✅ |
| CP-15 | Contraseña corta o correo inválido | 400 | ✅ |
| CP-16 | Acceso sin token, con token falso o con rol incorrecto | 401 / 401 / 403 | ✅ |
| CP-17 | Usuario desactivado | No puede iniciar sesión (401) | ✅ |

### 3.3 Catálogo y compras (`tests/catalogo-pedidos.test.js`)

| ID | Caso | Resultado esperado | Estado |
|---|---|---|---|
| CP-20 | Catálogo con filtros por tipo y búsqueda | Lista filtrada correctamente | ✅ |
| CP-21 | Endpoint `/calcular` | 3 galones y `stock_suficiente = true` | ✅ |
| CP-22 | Compra con productos repetidos | Agrupa líneas, total correcto, descuenta stock | ✅ |
| CP-23 | Compra con un producto sin stock | 409 y **no** descuenta ningún producto | ✅ |
| CP-24 | Carrito vacío o cantidad negativa | 400 | ✅ |
| CP-25 | Pintor intenta comprar | 403 | ✅ |

### 3.4 Solicitudes de servicio (`tests/solicitudes.test.js`)

| ID | Caso | Resultado esperado | Estado |
|---|---|---|---|
| CP-30 | Flujo completo: crear → aceptar → iniciar → completar → calificar | Estados y fechas correctos; reserva de stock; calificación visible al pintor | ✅ |
| CP-31 | Solicitud sin stock suficiente | 409 | ✅ |
| CP-32 | Dos pintores aceptan la misma solicitud | El segundo recibe 409 | ✅ |
| CP-33 | Pintor gestiona un trabajo ajeno | 403 | ✅ |
| CP-34 | Saltar estados (completar sin iniciar) | 409 | ✅ |
| CP-35 | Cancelación por el cliente | Estado `cancelada` y stock devuelto | ✅ |
| CP-36 | Cancelar una solicitud ajena o ya aceptada | 403 / 409 | ✅ |
| CP-37 | Reglas de calificación | Solo completadas, una vez, rango 1–5, solo el dueño | ✅ |
| CP-38 | Validaciones (m² = 0, sin dirección, pintura inexistente, fecha inválida) | 400 / 400 / 404 / 400 | ✅ |

### 3.5 Administración (`tests/admin.test.js`)

| ID | Caso | Resultado esperado | Estado |
|---|---|---|---|
| CP-40 | Crear, editar y desactivar una pintura | CRUD correcto; el producto inactivo desaparece del catálogo | ✅ |
| CP-41 | Validación de producto (tipo, precio, color, inexistente) | 400 / 404 | ✅ |
| CP-42 | Ajuste de stock ± | Suma o resta; no permite stock negativo | ✅ |
| CP-43 | Listado de usuarios | Sin contraseñas | ✅ |
| CP-44 | Estadísticas | Ventas, estados, promedio, ranking y alertas de stock correctos | ✅ |
| CP-45 | El admin se desactiva a sí mismo | 400 | ✅ |

### 3.6 Chatbot con IA (`tests/chatbot.test.js`)

| ID | Caso | Resultado esperado | Estado |
|---|---|---|---|
| CP-50 | Sin `OPENAI_API_KEY` | 503 con mensaje claro | ✅ |
| CP-51 | OpenAI (proveedor por defecto) | POST a `/v1/chat/completions`, `Bearer` y mensaje `system` | ✅ |
| CP-52 | Gemini (alternativo) | El catálogo va en el prompt, se añade la pista de cálculo y se guarda el historial | ✅ |
| CP-53 | Error del proveedor (cuota, 429) | 502 con detalle; no guarda historial | ✅ |
| CP-54 | Sin sesión o mensaje vacío | 401 / 400 | ✅ |
| CP-55 | Prompt con producto agotado y pista de m² | Marca `AGOTADO`; 80 m² × 3 manos → 7 galones | ✅ |

## 4. Prueba funcional de interfaz (Playwright)

Recorrido automatizado en Chromium a 1360×860. **No hubo errores de JavaScript en consola.**

| Paso | Rol | Evidencia |
|---|---|---|
| Inicio de sesión | — | `img/01-login.png` |
| Catálogo y carrito | Cliente | `img/02-catalogo.png`, `img/03-carrito.png` |
| Compra realizada | Cliente | `img/04-mis-compras.png` |
| Calculadora (45 m², 2 manos) | Cliente | `img/05-calculadora.png` |
| Solicitud creada | Cliente | `img/06-mis-solicitudes.png` |
| Chatbot | Cliente | `img/07-chatbot.png` (*) |
| Aceptar, iniciar y completar | Pintor | `img/08-pintor-disponibles.png`, `img/09-pintor-trabajos.png` |
| Calificar con 4 estrellas | Cliente | `img/10-calificar.png` |
| Indicadores e inventario | Admin | `img/11-admin-indicadores.png`, `img/12-admin-inventario.png`, `img/13-admin-nueva-pintura.png` |

(*) En la captura automatizada la respuesta de la IA es simulada. Para la exposición, ejecutar con `OPENAI_API_KEY` y tomar una captura real.

## 5. Defectos encontrados y corregidos durante el desarrollo

| # | Defecto | Corrección |
|---|---|---|
| 1 | Una compra con un producto agotado podía descontar el stock de los demás productos antes de fallar | Se valida el stock de **todas** las líneas antes de descontar (CP-23) |
| 2 | Postgres devuelve `numeric` como texto y rompía las sumas | Normalización numérica en `src/db/supabase.js` |
| 3 | La vista `v_ranking_pintores` podía saltarse RLS | Se creó con `security_invoker = true` |

## 6. Limitaciones y recomendaciones

- Las pruebas usan el repositorio en memoria. El adaptador de Supabase comparte la misma interfaz, pero se recomienda una prueba manual del flujo completo con la base real antes de la entrega.
- Las operaciones de stock no son transaccionales en Supabase. Para producción se recomienda moverlas a una función `rpc` de PostgreSQL.
- La calidad de las respuestas de la IA se mide aparte con `npm run eval:chatbot` (ver `RESULTADOS_ESTADISTICOS.md`).
