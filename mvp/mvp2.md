# [EPIC] MVP-2 – Parcours & Bibliothèque minimale

## Description

Poser la brique “parcours” de The Run :

- Permettre à un organisateur d’associer un **parcours tracé sur carte** à un événement.
- Faire en sorte que chaque parcours d’événement devienne un **parcours réutilisable** dans une bibliothèque personnelle.
- Offrir une première version de **réutilisation** et de **suggestions simples** de parcours lors de la création d’une nouvelle sortie.

Dans ce MVP-2, on vise un scope raisonnable :
- 1 à N parcours (`EventRoute`) possibles par `Event`,
- une “bibliothèque” centrée sur **“Mes parcours”**,  
- des suggestions basées sur la **zone** et la **distance cible**.

## Objectifs

- Éviter que l’organisateur redessine à chaque fois les mêmes boucles.
- Rendre les sorties plus “pro” avec un tracé lisible pour tous.
- Commencer à capitaliser une base de parcours exploitable plus tard par la communauté et par RunGraph.
- Préparer le futur : multi-parcours, tags (route/trail/plat/vallonné), suggestions plus avancées.

---

# S2.1.1 – Créer un parcours pour un événement

## User Story

En tant qu’**organisateur**,  
quand je crée ou édite un événement,  
je veux pouvoir définir un parcours sur une carte,  
afin que les participants visualisent clairement la boucle prévue.

## Critères d’acceptation

- [ ] Sur l’écran de création/édition d’un `Event`, une section “Parcours” est disponible.
- [ ] L’organisateur peut créer au moins **un parcours** associé à l’événement (MVP).
- [ ] Lors de la création d’un parcours, l’organisateur peut :
  - [ ] Afficher une carte centrée sur le lieu de rendez-vous de l’event.
  - [ ] Dessiner un tracé simple sous forme de polyligne (clics successifs sur la carte).
- [ ] Une distance approximative du tracé est calculée et affichée (ex. “≈ 7,8 km”).
- [ ] Le parcours est enregistré en base comme un `EventRoute` lié à l’`Event`.
- [ ] L’organisateur peut éditer le tracé avant de sauvegarder l’événement.
- [ ] Si aucun parcours n’est défini, l’événement reste valide (cas “sortie sans tracé” accepté en MVP).

## Notes techniques

- Modèle `EventRoute` minimal :
  - `id`, `eventId`, `name` (optionnel), `geometry` (polyligne encodée ou GeoJSON), `distanceMeters` (approx).
- Calcul de distance possible côté front (lib de géo) ou backend.
- Pour le MVP, pas d’import GPX obligatoire (peut arriver en V1).

---

**Phase**: MVP  
**Level**: Story  
**Area**: Backend, Web/Mobile UI, Cartographie

---

# S2.1.2 – Afficher le parcours sur la page d’événement

## User Story

En tant que **participant**,  
quand je consulte la fiche d’un événement,  
je veux voir le tracé du parcours sur une carte,  
afin de comprendre rapidement où on va courir et la distance prévue.

## Critères d’acceptation

- [ ] Sur la page de détail d’un `Event`, si au moins un `EventRoute` existe :
  - [ ] Une section “Parcours” ou un onglet dédié est affiché.
- [ ] Pour chaque parcours associé à l’événement, la page affiche :
  - [ ] le nom / label du parcours (ex : “Boucle 8 km EF” ou “Parcours principal”),
  - [ ] la distance (ex. “8,2 km”),
  - [ ] une mini-carte avec le tracé visible.
- [ ] L’utilisateur peut ouvrir la carte en plus grand (ou zoomer) pour voir le parcours dans son contexte.
- [ ] Si aucun parcours n’est défini pour l’événement, la section “Parcours” n’apparaît pas ou affiche un message type “Parcours en cours de définition”.

## Notes techniques

- Même endpoint `GET /events/{eventId}` peut renvoyer les `EventRoute` associés (ou endpoint dédié `GET /events/{eventId}/routes`).
- Côté UI, utiliser un composant carte réutilisable (même lib que pour la création) en mode read-only.

---

**Phase**: MVP  
**Level**: Story  
**Area**: Web/Mobile UI, Cartographie

---

# S2.2.1 – Sauvegarder un parcours dans la bibliothèque personnelle

## User Story

En tant qu’**organisateur régulier**,  
quand je définis un parcours pour un événement,  
je veux que ce parcours soit automatiquement sauvegardé dans ma bibliothèque,  
afin de pouvoir le réutiliser facilement pour mes prochaines sorties.

## Critères d’acceptation

- [ ] Lorsqu’un `EventRoute` est créé et sauvegardé pour un event, un objet “parcours” réutilisable est créé dans la bibliothèque de l’organisateur (ex. `Route`).
- [ ] Ce “Route” contient au minimum :
  - [ ] la géométrie (polyligne),
  - [ ] la distance,
  - [ ] un nom (repris du label de l’`EventRoute` ou généré automatiquement),
  - [ ] une zone géographique (centre + rayon approximatif).
- [ ] Un même parcours utilisé dans plusieurs events ne crée pas forcément un doublon (MVP : doublon accepté ; déduplication éventuelle en V1).
- [ ] Le “Route” est rattaché au créateur (ownerId = organisateur) pour alimenter sa section “Mes parcours”.
- [ ] Si l’événement est supprimé, les parcours déjà sauvegardés dans la bibliothèque ne sont pas supprimés (à confirmer, mais MVP : les garder).

## Notes techniques

- Introduire un modèle `Route` :
  - `id`, `ownerId`, `name`, `geometry`, `distanceMeters`, `centerLat`, `centerLng`, `radiusMeters`, `tags` (optionnel).
- `EventRoute` peut référencer un `Route` via `routeId`, ou dupliquer la géométrie – à décider (pour MVP on peut copier, mais prévoir l’évolution).
- Calcul du centre / rayon à partir de la polyligne (bounding box → centre + rayon approximatif).

---

**Phase**: MVP  
**Level**: Story  
**Area**: Backend

---

# S2.2.2 – Liste “Mes parcours”

## User Story

En tant qu’**organisateur**,  
quand je prépare mes prochaines sorties,  
je veux pouvoir voir la liste de mes parcours enregistrés,  
afin de choisir facilement une boucle déjà éprouvée.

## Critères d’acceptation

- [ ] L’app propose un écran “Mes parcours” accessible pour un utilisateur connecté.
- [ ] Cet écran liste les `Route` dont `ownerId = userId` (bibliothèque personnelle).
- [ ] Pour chaque parcours dans la liste, on affiche :
  - [ ] le nom du parcours,
  - [ ] la distance,
  - [ ] la zone (ville / secteur dérivé du centre),
  - [ ] une mini-carte du tracé (ou au moins une icône de type route/trail).
- [ ] Il est possible de cliquer sur un parcours pour voir un écran de détail :
  - [ ] carte en plus grand,
  - [ ] distance,
  - [ ] éventuels tags (route/trail/plat/vallonné si déjà gérés).
- [ ] Si l’utilisateur n’a encore aucun parcours, un message guide (“Crée ton premier parcours en ajoutant un tracé à une sortie”).

## Notes techniques

- Endpoint typique : `GET /me/routes` pour récupérer les `Route` de l’utilisateur.
- Prévoir une pagination simple si la liste devient longue.
- La suppression/édition de parcours peut être gérée en V1 (non obligatoire pour MVP).

---

**Phase**: MVP  
**Level**: Story  
**Area**: Backend, Web/Mobile UI

---

# S2.3.1 – Réutiliser un parcours existant lors de la création d’un événement

## User Story

En tant qu’**organisateur régulier**,  
quand je crée une nouvelle sortie,  
je veux pouvoir sélectionner un parcours existant dans ma bibliothèque,  
afin de ne pas redessiner à chaque fois les mêmes boucles.

## Critères d’acceptation

- [ ] Lors de la création/édition d’un `Event`, dans la section “Parcours”, l’organisateur a le choix entre :
  - [ ] Créer un nouveau parcours,
  - [ ] Sélectionner un parcours existant dans “Mes parcours”.
- [ ] En choisissant “Sélectionner un parcours existant” :
  - [ ] Une liste des `Route` de l’utilisateur s’affiche (mêmes infos que dans “Mes parcours”).
  - [ ] L’organisateur peut filtrer la liste par distance approximative (ex. champs libre “Distance cible” déjà saisi).
- [ ] Lorsqu’un parcours est sélectionné :
  - [ ] Un `EventRoute` est créé pour l’`Event` en référençant ce `Route` ou en copiant ses données (distance, géométrie).
  - [ ] Le tracé apparaît dans la section “Parcours” de l’event (comme s’il avait été dessiné manuellement).
- [ ] L’organisateur peut annuler le choix et revenir à “Créer un parcours”.

## Notes techniques

- Endpoint possible : `GET /me/routes?distanceAround=<X>` pour filtrer par distance (optionnel pour MVP).
- `EventRoute` peut contenir `routeId` plus `geometry`/`distance` “snapshot” pour historiser l’état au moment de l’événement.
- Recyclage des composants UI déjà utilisés pour “Mes parcours”.

---

**Phase**: MVP  
**Level**: Story  
**Area**: Backend, Web/Mobile UI

---

# S2.3.2 – Suggestions de parcours par zone et distance cible

## User Story

En tant qu’**organisateur**,  
quand je crée une nouvelle sortie en indiquant un lieu de départ et une distance cible,  
je veux que l’app me suggère automatiquement des parcours adaptés autour de ce lieu,  
afin de gagner du temps et de varier les boucles sans trop réfléchir.

## Critères d’acceptation

- [ ] Lors de la création d’un `Event`, lorsque :
  - [ ] un lieu de rendez-vous est renseigné,
  - [ ] une distance cible est renseignée (ex. 8 km),
    l’app peut proposer des “Parcours suggérés”.
- [ ] Les suggestions de parcours apparaissent dans la section “Parcours” sous forme de bloc :
  - [ ] Titre : “Parcours suggérés près de toi – [X–Y] km”.
  - [ ] Liste de quelques parcours (3–5) provenant :
    - [ ] d’abord de “Mes parcours” proches du lieu,
    - [ ] puis éventuellement de la bibliothèque globale (en Premium, plus tard).
- [ ] Chaque suggestion affiche :
  - [ ] nom,
  - [ ] distance,
  - [ ] mini-carte,
  - [ ] distance approximative par rapport au point de départ (par ex. “à 500 m du point de RDV” si on le gère).
- [ ] Un clic sur une suggestion associe ce parcours à l’event en tant que `EventRoute`.
- [ ] Si aucun parcours ne correspond (distance/tolérance/zone), un message s’affiche (“Aucun parcours suggéré pour ce secteur, crée-en un nouveau.”).

## Notes techniques

- Filtrage minimal basé sur :
  - distance : `abs(route.distanceMeters - targetDistanceMeters) <= tolerance` (ex. ±20%),
  - zone : rayon autour du point de RDV (ex. 3–5 km).
- Endpoint possible : `GET /routes/suggest?lat=<>&lng=<>&distance=<>&ownerFirst=true`.
- Pour le MVP, ne suggérer que les routes du user ; l’ouverture à la bibliothèque globale viendra en V1/Premium.
- Penser à la perf : limiter le nombre de suggestions renvoyées (ex. 5 max).

---

**Phase**: MVP  
**Level**: Story  
**Area**: Backend, Web/Mobile UI, Cartographie
