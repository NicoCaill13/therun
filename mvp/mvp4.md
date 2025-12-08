# [EPIC] MVP-4 – Participants & RSVP

## Description

Gérer tout ce qui se passe **après** l’accès à l’événement (invitation, QR, code) :

- permettre aux utilisateurs de dire “Je viens” / “Je ne viens plus” (RSVP),
- leur permettre de choisir (ou modifier) leur **parcours** et éventuellement leur **groupe d’allure**,
- offrir à l’organisateur une **vue claire des participants** (liste + synthèse),
- envoyer des **rappels** aux participants et à l’organisateur avant la sortie.

Cet EPIC se connecte :
- à MVP-1 (Event & rôles de base),
- à MVP-2 (Parcours & bibliothèque),
- à MVP-3 (Invitation & accès).

## Objectifs

- Donner aux participants un moyen simple et explicite de gérer leur participation.
- Permettre à l’organisateur de savoir **combien de personnes** seront là et **dans quels groupes**.
- Automatiser les **rappels** pour limiter les no-shows et rassurer tout le monde.
- Préparer les futures fonctionnalités de sécurité / check-in / stats (RunGraph).

---

# S4.1.1 – Boutons “Je participe” / “Je ne viens plus”

## User Story

En tant que **participant potentiel**,  
quand j’ouvre la fiche d’un événement,  
je veux pouvoir indiquer facilement si je viens ou non,  
afin que l’organisateur sache si je serai présent sans passer par WhatsApp.

## Critères d’acceptation

- [ ] Si l’utilisateur est connecté et consulte un `Event` :
  - [ ] Si aucune entrée `EventParticipant` n’existe pour cet utilisateur :
    - [ ] Un bouton “Je participe” est affiché.
  - [ ] Si une entrée `EventParticipant` existe :
    - [ ] Si `status = GOING`, le bouton principal devient “Je ne viens plus”.
    - [ ] Si `status = INVITED` ou `MAYBE`, deux actions sont disponibles : “Je viens” / “Je ne viens pas”.
- [ ] Clic sur “Je participe” :
  - [ ] Crée un `EventParticipant` si besoin, avec `status = GOING` et `roleInEvent = PARTICIPANT` (par défaut).
  - [ ] Ou met à jour un `EventParticipant` existant pour passer `status` à `GOING`.
- [ ] Clic sur “Je ne viens plus” / “Je ne viens pas” :
  - [ ] Met à jour `status = DECLINED` pour ce `EventParticipant`.
- [ ] Après mise à jour, l’état de l’UI est rafraîchi (texte du bouton, compteur de participants côté organisateur).
- [ ] Un utilisateur non connecté qui clique sur “Je participe” est redirigé vers le flux d’onboarding / guest (EPIC Onboarding), puis revient sur l’event.

## Notes techniques

- Endpoint typique :
  - `POST /events/{eventId}/participants/me` avec un body `{ status: "GOING" | "DECLINED" | "MAYBE" }`.
- S’appuie sur la contrainte `(eventId, userId)` unique dans `EventParticipant`.
- Le statut `INVITED` est initialisé par MVP-3, puis transformé ici en `GOING` ou `DECLINED`.

---

**Phase**: MVP  
**Level**: Story  
**Area**: Backend, Web/Mobile UI

---

# S4.1.2 – Choisir / modifier son parcours et son groupe d’allure

## User Story

En tant que **participant**,  
quand je m’inscris à un événement avec plusieurs parcours ou groupes,  
je veux pouvoir choisir (et éventuellement modifier) mon parcours et mon groupe d’allure,  
afin de courir avec des personnes de mon niveau sur la bonne distance.

## Critères d’acceptation

- [ ] Si l’événement possède au moins un `EventRoute`, l’écran de participation propose :
  - [ ] une liste des parcours disponibles (nom, distance, mini-carte).
- [ ] Si des `EventGroup` sont définis pour un `EventRoute`, l’UI propose, après le choix du parcours :
  - [ ] une liste de groupes d’allure (ex. “8–9 km/h”, “10–11 km/h”).
- [ ] Lorsqu’un participant clique sur “Je participe” :
  - [ ] Il peut choisir immédiatement un `eventRouteId` (ou rester “non assigné” si permis).
  - [ ] Il peut choisir un `eventGroupId` optionnel (ou “Je verrai sur place”).
- [ ] Les choix sont stockés dans `EventParticipant` :
  - [ ] `eventRouteId` = parcours choisi (ou null),
  - [ ] `eventGroupId` = groupe d’allure choisi (ou null).
- [ ] Après inscription, le participant peut revenir sur la fiche d’event et :
  - [ ] changer de parcours (dans la limite des parcours existants),
  - [ ] changer de groupe d’allure.
- [ ] Le changement de parcours / groupe met à jour la vue organisateur (répartition par parcours / groupe).

## Notes techniques

- Étendre le modèle `EventParticipant` avec :
  - `eventRouteId` (nullable),
  - `eventGroupId` (nullable).
- Endpoint possible :
  - `PATCH /events/{eventId}/participants/me` pour modifier `eventRouteId` et `eventGroupId`.
- Les `EventRoute` et `EventGroup` sont définis dans MVP-2 / EPIC Groups (à relier).

---

**Phase**: MVP  
**Level**: Story  
**Area**: Backend, Web/Mobile UI

---

# S4.2.1 – Vue “Liste des participants” pour l’organisateur

## User Story

En tant qu’**organisateur**,  
quand j’ouvre la fiche de mon événement,  
je veux voir la liste des participants avec leur statut et leurs choix (parcours/groupe),  
afin de savoir qui vient, sur quelle distance et à quelle allure.

## Critères d’acceptation

- [ ] Sur la page d’un `Event`, une section “Participants” est visible pour l’organisateur.
- [ ] Cette section liste tous les `EventParticipant` avec `status != DECLINED`.
- [ ] Pour chaque participant, la vue affiche :
  - [ ] nom (et avatar si disponible),
  - [ ] rôle dans l’event (`ORGANISER`, `ENCADRANT`, `PARTICIPANT`),
  - [ ] statut (`INVITED`, `GOING`, `MAYBE`),
  - [ ] le parcours choisi (nom de l’`EventRoute` ou “Non choisi”),
  - [ ] le groupe d’allure (nom de l’`EventGroup` ou “Non assigné”).
- [ ] L’organisateur peut filtrer la liste par :
  - [ ] statut de participation (GOING / INVITED / MAYBE),
  - [ ] parcours,
  - [ ] groupe d’allure.
- [ ] Les encadrants sont clairement identifiés (badge ou colonne dédiée).

## Notes techniques

- Endpoint typique : `GET /events/{eventId}/participants` retournant :
  - `user` (nom, avatar),
  - `roleInEvent`,
  - `status`,
  - `eventRoute` (id, name),
  - `eventGroup` (id, name).
- La même API peut être utilisée pour afficher une vue simplifiée aux encadrants (avec filtrage côté front).

---

**Phase**: MVP  
**Level**: Story  
**Area**: Backend, Web/Mobile UI

---

# S4.2.2 – Vue synthèse (totaux & répartition)

## User Story

En tant qu’**organisateur**,  
quand je prépare une sortie avec plusieurs groupes,  
je veux un résumé rapide du nombre de personnes par parcours et par groupe,  
afin d’anticiper l’encadrement, la sécurité et le niveau du groupe.

## Critères d’acceptation

- [ ] Sur la page d’un `Event`, au-dessus ou à côté de la liste des participants, une **vue synthèse** est affichée pour l’organisateur.
- [ ] La synthèse affiche au minimum :
  - [ ] le nombre total de participants avec `status = GOING`,
  - [ ] le nombre de participants avec `status = INVITED` (pas encore décidés),
  - [ ] le nombre de participants avec `status = MAYBE`.
- [ ] Si plusieurs parcours existent :
  - [ ] Pour chaque `EventRoute`, la synthèse affiche :
    - [ ] le nom du parcours,
    - [ ] le nombre de participants `GOING` sur ce parcours.
- [ ] Si des groupes d’allure existent :
  - [ ] Pour chaque `EventGroup`, la synthèse affiche :
    - [ ] le nom du groupe,
    - [ ] le nombre de participants `GOING` dans ce groupe.
- [ ] Les chiffres se mettent à jour en temps réel (ou après refresh) lorsqu’un participant change de statut / parcours / groupe.

## Notes techniques

- Possibilité d’agréger côté backend (endpoint dédié type `GET /events/{eventId}/participants/summary`) ou de calculer côté front.
- Données nécessaires :
  - liste des participants,
  - liens vers `EventRoute` et `EventGroup`.
- Cette synthèse sera aussi utilisée plus tard pour les notifications “Rappel organisateur”.

---

**Phase**: MVP  
**Level**: Story  
**Area**: Backend (agrégation), Web/Mobile UI

---

# S4.3.1 – Rappel aux participants avant l’événement

## User Story

En tant que **participant inscrit**,  
quand la sortie approche,  
je veux recevoir un rappel automatique,  
afin de ne pas oublier l’événement et d’avoir les infos essentielles sous la main.

## Critères d’acceptation

- [ ] Un rappel est envoyé automatiquement aux participants avec `status = GOING` avant l’événement.
- [ ] Pour le MVP, l’horaire du rappel est fixe (ex. 2h avant `startDateTime`).
- [ ] Le rappel contient au minimum :
  - [ ] le titre de l’event,
  - [ ] l’heure de départ,
  - [ ] le lieu (adresse / carte),
  - [ ] éventuellement le parcours et le groupe choisis.
- [ ] Le rappel apparaît sous forme de :
  - [ ] notification in-app (et/ou push, si déjà en place),
  - [ ] et/ou email simple (optionnel au MVP).
- [ ] Les participants avec `status = DECLINED` ou `INVITED` ne reçoivent pas ce rappel.
- [ ] Le système ne renvoie pas plusieurs fois le même rappel à un même participant (idempotence sur eventId/userId).

## Notes techniques

- Nécessite une tâche planifiée / worker (cron) qui :
  - parcourt les events à venir,
  - trouve les participants `GOING`,
  - crée/expédie les notifications.
- Paramètre d’horizon (ex. traiter les events à H-2 toutes les 5–10 minutes).
- Stocker une trace d’envoi (log ou table `Notification`) pour éviter les doublons.

---

**Phase**: MVP  
**Level**: Story  
**Area**: Backend (jobs/cron), Notifications

---

# S4.3.2 – Rappel organisateur avec résumé

## User Story

En tant qu’**organisateur**,  
quand l’heure de ma sortie approche,  
je veux recevoir un rappel avec un résumé du nombre de participants et des groupes,  
afin d’arriver préparé et de savoir à quoi m’attendre.

## Critères d’acceptation

- [ ] Un rappel spécifique est envoyé à l’**organisateur** avant l’événement (même timing que les participants ou légèrement plus tôt, ex. 3h).
- [ ] Ce rappel contient au minimum :
  - [ ] le titre de l’event,
  - [ ] l’heure et le lieu,
  - [ ] le nombre total de participants `GOING`,
  - [ ] la répartition par parcours (si plusieurs `EventRoute`),
  - [ ] la répartition par groupe d’allure (si `EventGroup` présents).
- [ ] Le rappel est envoyé uniquement si au moins 1 participant `GOING` existe (sinon, message différent possible en V1).
- [ ] L’organisateur ne reçoit qu’un seul rappel par event.
- [ ] Le rappel peut être :
  - [ ] notification in-app (et/ou push),
  - [ ] email de résumé (optionnel au MVP).

## Notes techniques

- Peut réutiliser la même tâche planifiée que S4.3.1 avec un traitement spécifique pour `organiserId`.
- S’appuie sur les données agrégées de S4.2.2 (ou recalcule l’agrégat au moment de l’envoi).
- Stocker un flag “organiserReminderSent” par event pour éviter les doublons.

---

**Phase**: MVP  
**Level**: Story  
**Area**: Backend (jobs/cron), Notifications, Web/Mobile UI
