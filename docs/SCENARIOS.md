> **Estado (v2.6):** implementados los 8 escenarios con nombres ficticios, trinkets y World Cities. Ver CHANGELOG. Decisiones: nombres ficticios con la inspiración real en la historia; los escenarios usan tus trinkets.

# Escenarios — propuesta

Un **escenario** es una partida corta y escrita a mano (10–15 minutos): empieza en un año y un lugar concretos, con una ciudad ya en marcha, un objetivo claro y reglas propias. Complementa la partida libre (1300–2030, ~18 min): la libre es el roguelite de construir un mazo; los escenarios son "misiones" con historia, que enseñan sistemas y dan recompensas para el Legacy.

## 1. Formato

| Campo | Qué es | Ejemplo (Ensanche) |
|---|---|---|
| Época | Año de inicio y de fin, 100–250 años | 1850 → 1950 |
| Lugar | Geografía y ciudad inicial | Costa; ciudad amurallada y abarrotada de 60.000 hab. |
| Situación | Lo que ya ha pasado | Murallas en pie, hacinamiento, cólera cerca |
| Objetivo principal | Una condición clara, medida cada año | 200.000 habitantes con prosperidad ≥ 70 |
| Estrellas | ★ objetivo · ★★ + secundario · ★★★ + desafío | ★★ el casco antiguo protegido · ★★★ sin Ruina y antes de 1925 |
| Reglas | Lo que cambia frente a la partida libre | Cartas de urbanismo baratas; la muralla no se derriba sola |
| Mazo | Fundador, mano inicial, cartas propias del escenario | Mano: *Planned Extension*, *Grand Boulevard* |
| Historia | 2–4 eventos fijos con fecha (anunciados como siempre) | 1854 cólera · 1888 Exposición Universal |
| Recompensa | LP por estrellas y un desbloqueo | Fundador "El Ingeniero"; carta *Chaflanes* |

Se pierde por **Ruina** o si llega el año final sin cumplir el objetivo (sin estrellas, pero se cobra parte del LP).

## 2. Primera tanda: 8 escenarios, uno o dos por época

1. **La villa del mercado** (1300–1420, tutorial). Una aldea en un vado. *Objetivo:* 3.000 habitantes y todas las necesidades cubiertas. Enseña zonas, cartas de edificio, el Market Hall y los eventos de cartas.
2. **El año de la peste** (1340–1420). La Peste Negra llega en 1348. *Objetivo:* recuperar la población de 1340 antes de 1400. Fe y Pueblo tienen respuestas propias; prueba la Unrest.
3. **Ciudad de peregrinos** (1350–1550, inspirada en Santiago o Toledo). *Objetivo:* doctrina de Fe en nivel 4 y la Catedral (Maravilla). Enseña a centrarse en una doctrina.
4. **Ciudad de canales** (1580–1720, inspirada en Ámsterdam). Estuario, comercio e inundaciones. *Objetivo:* Comercio en nivel 3 y tres anillos de canal. La muralla se convierte en canal.
5. **El ensanche** (1850–1950, inspirada en Barcelona). Ciudad amurallada y abarrotada. *Objetivo:* 200.000 habitantes con prosperidad ≥ 70. Derribar murallas, trazar la cuadrícula ancha, bulevares y chaflanes. Es el escenario estrella del nuevo pase visual.
6. **Humo y ladrillo** (1800–1900, inspirada en Manchester). Boom industrial con contaminación. *Objetivo:* Industria en nivel 4 sin que ningún barrio decaiga por el aire. Plazas ajardinadas y barrios obreros.
7. **Reconstrucción** (1945–2000). Media ciudad destruida en la guerra. *Objetivo:* recuperar la población de 1939. ★★: conservar el casco antiguo frente a la ronda y los bloques modernos.
8. **La ciudad del siglo XXI** (1990–2030). Las fábricas cierran. *Objetivo:* convertir *The Works* en un barrio de innovación y llegar a prosperidad 85. Prueba el Aprendizaje, el turismo y el parque lineal.

Se desbloquean en orden; ganar con ★ abre el siguiente, así que la curva va de tutorial a desafío.

## 3. En el juego

- **Inicio:** una pestaña *Escenarios* en la portada. Cada escenario es una página del almanaque con año, lugar, objetivo y estrellas ganadas; los detalles van tras su (i).
- **Durante la partida:** una píldora con el objetivo en la barra superior ("★ 132.000 / 200.000 · 1871") y el progreso de las estrellas tras su (i).
- **Al final:** el resumen de partida que ya existe, con las estrellas y la recompensa.

## 4. Cómo se construye

- `src/scenarios.js`: cada escenario como datos (año, lugar, semilla, ciudad inicial, reglas, objetivos, eventos, mazo, recompensa).
- **Ciudad inicial:** se genera haciendo jugar a un bot hasta el año de inicio con una semilla fija, así sale igual siempre y sin dibujar mapas a mano. Después se aplican los retoques (murallas, población, daños de guerra).
- **Objetivos:** funciones que leen las estadísticas que ya tiene el juego; se evalúan una vez al año.
- **Tests:** un bot "sensato" debe poder sacar ★ en cada escenario y uno pasivo no.

**Hitos:** SC1 (motor, interfaz y 3 escenarios: villa, ensanche y peste) · SC2 (los otros 5 y sus eventos fijos) · SC3 (equilibrado de estrellas y recompensas).

## 5. Decisiones para ti

1. ¿Nombres reales ("Barcelona, 1859") o ficticios inspirados ("Una ciudad mediterránea, 1859")? Propuesta: ficticios con una nota "inspirado en", para que la ciudad generada no tenga que parecerse al plano real.
2. ¿Empezamos por SC1 con estos tres escenarios?
3. ¿Los escenarios usan el Legacy (fundadores, artefactos) o un mazo fijo para que sean iguales para todos? Propuesta: mazo fijo, con un modo "con tu Legacy" que no da estrellas.
