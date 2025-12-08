# [EPIC] MVP-7 – Historique & réutilisation

## Description

Mettre en place tout ce qui permet de **capitaliser** sur ce qui a déjà été fait :

- basculer les événements passés dans un **historique lisible**,
- alimenter automatiquement la **bibliothèque de parcours** à partir des événements terminés,
- permettre à l’organisateur de **recréer une sortie** en quelques secondes à partir :
  - d’un **parcours existant**,
  - ou d’un **événement passé** (duplication).

Cet EPIC donne le côté “outil de productivité” de The Run :  
moins de temps à préparer, plus de temps à courir.

## Objectifs

- Éviter de “perdre” les événements passés : tout doit rester consultable et exploitable.
- Faire en sorte que **chaque nouvelle sortie soit plus simple** à organiser que la précédente.
- Poser la logique de **bibliothèque de parcours réutilisables**.
- Préparer RunGraph (data) en structurant bien la séparation Event / Route réutilisable.

---

# S7.1.1 – Marquer un événement comme “terminé”

## User Story

En tant qu’**organisateur**,  
quand une sortie est passée,  
je veux que l’événement soit marqué comme “terminé”,  
afin qu’il sorte de la liste “à venir” et alimente mon historique et la bibliothèque de parcours.

## Critères d’acceptation

- [ ] Un `Event` possède un champ `status` au minimum avec les valeurs :
  - [ ] `PLANNED` (par défaut à la création),
  - [ ] `COMPLETED`,
  - [ ] `CANCELLED`.
- [ ] Quand la date/heure de début `startDateTime` est dépassée d’un certain délai (ex. +4h) :
  - [ ] un job côté backend peut marquer automatiquement l’event comme `COMPLETED` si `status` est toujours `PLANNED`.
- [ ] L’organisateur peut également marquer manuellement l’événement comme “Terminé” depuis la fiche event (bouton d’action) :
  - [ ] cela met `status = COMPLETED`.
- [ ] Un event `COMPLETED` :
  - [ ] n’apparaît plus dans la liste des “Événements à venir”,
  - [ ] apparaît dans la liste “Événements passés / Historique” (cf. S7.1.2),
  - [ ] déclenche la logique de création/MAJ des parcours réutilisables (S7.2.1).

## Notes techniques

- Job batch (cron) possible pour la complétion auto (ex. toutes les 15 min).
- L’action manuelle de clôture existe déjà dans le CdC (rôles), on la relie ici à la logique d’historique.
- Attention : un événement `CANCELLED` ne doit pas alimenter la bibliothèque.

---

**Phase**: MVP  
**Level**: Story  
**Area**: Backend, Web/Mobile UI

---

# S7.1.2 – Liste “Mes événements passés” (historique organisateur)

## User Story

En tant qu’**organisateur**,  
quand je reviens sur The Run,  
je veux pouvoir voir la liste de mes événements passés,  
afin de vérifier ce que j’ai déjà organisé et de m’en inspirer.

## Critères d’acceptation

- [ ] Dans l’app, une section / onglet “Mes événements” permet de basculer entre :
  - [ ] “À venir” (events avec `status = PLANNED` et `startDateTime` futur),
  - [ ] “Passés” (events avec `status = COMPLETED` et `startDateTime` passé).
- [ ] L’onglet “Passés” liste les événements dont l’utilisateur est `organiserId` (et éventuellement co-organisateur plus tard).
- [ ] Pour chaque event de l’historique, la liste affiche :
  - [ ] Titre,
  - [ ] Date de l’événement,
  - [ ] Lieu principal,
  - [ ] Nombre de participants `GOING` au moment de la complétion.
- [ ] Un tap sur un event terminé ouvre la fiche en **lecture seule** :
  - [ ] infos générales,
  - [ ] parcours liés (`EventRoute`),
  - [ ] synthèse participants (optionnel en MVP, mais au moins le total).
- [ ] Les events `CANCELLED` peuvent apparaître dans l’historique avec un statut distinct, ou être filtrés (choix produit, mais cohérent dans la liste).

## Notes techniques

- Endpoint :
  - `GET /me/events?scope=future` pour les events à venir,
  - `GET /me/events?scope=past` pour les events passés,
  - ou un paramètre `status` / `before/after` unique.
- Réutilise le modèle `Event` existant ; seule la vue change.

---

**Phase**: MVP  
**Level**: Story  
**Area**: Web/Mobile UI, Backend

---

# S7.2.1 – Alimenter automatiquement la bibliothèque de parcours à partir des events complétés

## User Story

En tant que **équipe produit / tech**,  
quand un événement est terminé,  
je veux que ses parcours (`EventRoute`) alimentent automatiquement la bibliothèque globale,  
afin de rendre ces tracés réutilisables par le même organisateur et par la communauté (selon l’offre).

## Critères d’acceptation

- [ ] Lorsqu’un `Event` passe au statut `COMPLETED` :
  - [ ] pour chaque `EventRoute` associé à cet event :
    - [ ] si la polyligne/tracé est valide, un `Route` (parcours réutilisable) est créé **ou** mis à jour.
- [ ] Un `Route` (bibliothèque) contient au minimum :
  - [ ] `id`,
  - [ ] `name` / label,
  - [ ] polyligne (points GPS),
  - [ ] distance,
  - [ ] D+ approximatif (si dispo),
  - [ ] centre géographique / zone (bbox ou point+rayon),
  - [ ] tags (route / trail / plat / vallonné, etc.),
  - [ ] méta-infos (créateur, première utilisation).
- [ ] Si un `EventRoute` utilise un `Route` déjà existant (réutilisation), on ne recrée pas un doublon, on incrémente seulement les stats d’usage (éventuellement pour RunGraph en V1/V2).
- [ ] Les events `CANCELLED` ne créent ni ne mettent à jour de `Route`.

## Notes techniques

- Distinction claire :
  - `EventRoute` = parcours dans le contexte d’un event,
  - `Route` = entrée globale de la bibliothèque mutualisée.
- Il peut être utile de stocker sur `EventRoute` un `routeId` facultatif pour la réutilisation (clé étrangère).
- La logique de création de `Route` peut être déclenchée :
  - soit lors du passage à `COMPLETED`,
  - soit via un job batch qui traite tous les `Event` complétés.

---

**Phase**: MVP  
**Level**: Story  
**Area**: Backend, Data model

---

# S7.2.2 – Sélectionner un parcours existant lors de la création d’une sortie

## User Story

En tant qu’**organisateur**,  
quand je crée une nouvelle sortie,  
je veux pouvoir sélectionner un parcours existant dans ma bibliothèque ou la bibliothèque globale,  
afin de ne pas avoir à redessiner le tracé à chaque fois.

## Critères d’acceptation

- [ ] Lors de la création ou l’édition d’un `EventRoute` dans un event :
  - [ ] l’organisateur peut choisir entre :
    - [ ] “Créer un nouveau parcours”,
    - [ ] “Choisir un parcours existant”.
- [ ] Si “Choisir un parcours existant” :
  - [ ] une liste de `Route` est proposée, filtrable au minimum par :
    - [ ] distance cible (ex. ~8 km),
    - [ ] zone géographique (autour du lieu de l’event).
- [ ] Les parcours disponibles suivent les règles de l’offre :
  - [ ] Free : accès à **ses propres parcours** + éventuellement ceux de ses events précédents,
  - [ ] Premium : accès à la **bibliothèque globale** (selon CdC Free/Premium).
- [ ] Quand un parcours est sélectionné :
  - [ ] un `EventRoute` est créé dans l’event avec une référence à ce `Route` (et copie des infos nécessaires),
  - [ ] la polyligne du `Route` est utilisée comme tracé de l’`EventRoute`.
- [ ] L’organisateur peut prévisualiser le tracé sur une mini-carte avant de valider.

## Notes techniques

- Endpoint :
  - `GET /routes?distanceMin=&distanceMax=&lat=&lng=&radius=` pour la recherche.
- `EventRoute` doit avoir un champ optionnel `routeId` qui pointe vers `Route`.
- La logique d’accès Free vs Premium dépendra de l’implémentation de l’offre (MVP : commencer par les parcours de l’organisateur).

---

**Phase**: MVP  
**Level**: Story  
**Area**: Backend, Web/Mobile UI

---

# S7.2.3 – Dupliquer un événement depuis l’historique

## User Story

En tant qu’**organisateur régulier**,  
quand je veux recréer la même sortie la semaine suivante,  
je veux pouvoir dupliquer un événement passé,  
afin de gagner du temps et d’éviter de tout reconfigurer (titre, parcours, groupes).

## Critères d’acceptation

- [ ] Sur la fiche d’un `Event` avec `status = COMPLETED` (ou sur la ligne de l’historique), une action “Dupliquer cet événement” est disponible.
- [ ] Le clic ouvre un écran de création pré-rempli avec :
  - [ ] le titre de l’event (avec éventuellement la date retirée),
  - [ ] le lieu / point de RDV,
  - [ ] les `EventRoute` associés (parcours) et leurs groupes d’allure,
  - [ ] les encadrants attachés à chaque groupe (optionnel en MVP).
- [ ] Les champs suivants **ne sont pas repris** :
  - [ ] la date/heure (ou sont repris mais obligatoirement modifiés avant validation),
  - [ ] la liste des participants (toujours vide au départ).
- [ ] Une fois la duplication validée :
  - [ ] un nouvel `Event` est créé avec un nouvel identifiant,
  - [ ] le nouvel event est en `status = PLANNED`,
  - [ ] les `EventRoute` sont recréés (ou ré-associés à leurs `Route` de bibliothèque),
  - [ ] aucun `EventParticipant` n’est copié.
- [ ] L’organisateur peut ensuite continuer le flow normal :
  - [ ] inviter des participants,
  - [ ] publier l’event, etc.

## Notes techniques

- Endpoint : `POST /events/{eventId}/duplicate`.
- Il est recommandé de dupliquer :
  - les structures (routes, groupes),
  - pas les entités dynamiques (participants, notifications).
- La duplication peut réutiliser la relation `routeId` pour éviter de recréer des `Route`.

---

**Phase**: MVP  
**Level**: Story  
**Area**: Backend, Web/Mobile UI
