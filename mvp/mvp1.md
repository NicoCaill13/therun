# [EPIC] MVP-1 – Événements & rôles de base

## Description

Poser le socle de The Run :  
- un **Événement** (Event) structuré avec les infos minimales (titre, date/heure, lieu, description),  
- un **organisateur** clairement identifié,  
- des **rôles par événement** (Organisateur, Encadrant, Participant) portés par l’entité `EventParticipant`.

Cet EPIC ne gère pas encore les parcours détaillés (EventRoute) ni les groupes d’allure : il s’agit d’abord de pouvoir créer un event propre, y associer des personnes et afficher correctement “qui fait quoi”.

## Objectifs

- Permettre à un utilisateur de créer une sortie “propre” avec le minimum d’informations structurées.
- Formaliser la relation **User ↔ Event** via `EventParticipant` et son `roleInEvent`.
- Faire en sorte que la page d’un événement rende immédiatement lisible :
  - qui organise,
  - qui encadre,
  - qui participe.
- Préparer le terrain pour les fonctionnalités RSVP, parcours et groupes d’allure (autres EPICs).

---

# S1.1.1 – Création d’un événement simple

## User Story

En tant qu’**organisateur**,  
quand je veux planifier une sortie running,  
je veux pouvoir créer un événement avec les infos essentielles (titre, date/heure, lieu, description),  
afin de formaliser la sortie et d’avoir une base propre pour inviter et gérer les participants.

## Critères d’acceptation

- [ ] Un écran “Créer un événement” est disponible dans l’app.
- [ ] Le formulaire de création permet de saisir :
  - [ ] un titre obligatoire,
  - [ ] une date de départ obligatoire,
  - [ ] une heure de départ obligatoire,
  - [ ] un lieu de rendez-vous (au minimum adresse textuelle, idéalement avec point sur carte),
  - [ ] une description courte optionnelle.
- [ ] La validation crée un enregistrement `Event` en base avec :
  - [ ] un `id` unique,
  - [ ] `organiserId` = `userId` du créateur,
  - [ ] les champs de base renseignés (titre, date/heure, lieu, description).
- [ ] En cas de champ obligatoire manquant ou invalide, un message d’erreur clair est affiché et la création est bloquée.
- [ ] Après création réussie, l’utilisateur est redirigé vers la page de détail de l’événement.

## Notes techniques

- Modèle `Event` minimal pour le MVP :
  - `id`, `organiserId`, `title`, `description`, `startDateTime`, `locationName`, `locationLat`, `locationLng`, `status` (`PLANNED` par défaut).
- Endpoint typique : `POST /events`.
- Prévoir un champ `status` sur `Event` pour gérer plus tard la clôture / annulation (`PLANNED`, `COMPLETED`, `CANCELLED`).

---

**Phase**: MVP  
**Level**: Story  
**Area**: Backend, Web/Mobile UI

---

# S1.1.2 – Page de détail d’un événement

## User Story

En tant que **participant potentiel**,  
quand on me parle d’une sortie The Run,  
je veux pouvoir consulter une page de détail de l’événement,  
afin de voir rapidement les informations importantes (qui, où, quand, quoi).

## Critères d’acceptation

- [ ] Une page “Détail de l’événement” est disponible pour chaque `Event`.
- [ ] Cette page affiche au minimum :
  - [ ] le titre de l’événement,
  - [ ] la date et l’heure de départ,
  - [ ] le lieu de rendez-vous (texte + éventuellement carte),
  - [ ] la description globale,
  - [ ] l’organisateur (nom + avatar si présent).
- [ ] Si l’utilisateur est l’organisateur de l’événement, des actions supplémentaires apparaissent (ex. bouton “Modifier”, “Clôturer” – cf. autre story).
- [ ] Si l’utilisateur est participant ou encadrant, son rôle apparaît quelque part sur la page (“Vous êtes : Participant / Encadrant / Organisateur”).
- [ ] Si l’utilisateur n’est pas encore lié à l’event, un CTA adapté est affiché (ex. “Je participe” dans d’autres EPICs).

## Notes techniques

- Endpoint typique : `GET /events/{eventId}` pour récupérer toutes les infos nécessaires.
- Pour le MVP, la section participants / encadrants peut être très simple (liste des noms et rôles) – les raffinements viendront dans d’autres EPICs.

---

**Phase**: MVP  
**Level**: Story  
**Area**: Backend, Web/Mobile UI

---

# S1.2.1 – Auto-attribution du rôle Organisateur

## User Story

En tant qu’**organisateur**,  
quand je crée un événement,  
je veux être automatiquement enregistré comme participant avec le rôle d’organisateur,  
afin d’apparaître dans la liste des participants et d’exercer mes droits sur cet event sans action supplémentaire.

## Critères d’acceptation

- [ ] À la création d’un `Event`, une entrée `EventParticipant` est automatiquement créée pour le créateur de l’event.
- [ ] Cette entrée `EventParticipant` contient :
  - [ ] `eventId` = id de l’événement créé,
  - [ ] `userId` = id de l’utilisateur créateur,
  - [ ] `roleInEvent = ORGANISER`,
  - [ ] `status = GOING`.
- [ ] Le `organiserId` de l’Event correspond toujours à un `EventParticipant` avec `roleInEvent = ORGANISER`.
- [ ] Sur la page de détail de l’événement, le créateur voit clairement qu’il est l’organisateur (badge ou mention explicite).

## Notes techniques

- Modèle `EventParticipant` minimal :
  - `id`, `eventId`, `userId`, `roleInEvent` (`ORGANISER` | `ENCADRANT` | `PARTICIPANT`), `status` (`INVITED` | `GOING` | `MAYBE` | `DECLINED`).
- Contrainte recommandée : un seul `EventParticipant` par couple `(eventId, userId)`.

---

**Phase**: MVP  
**Level**: Story  
**Area**: Backend

---

# S1.2.2 – Promotion d’un participant en Encadrant

## User Story

En tant qu’**organisateur**,  
quand un runner expérimenté accepte de m’aider à encadrer la sortie,  
je veux pouvoir le promouvoir au rôle d’encadrant sur cet événement,  
afin qu’il soit identifié comme tel et qu’il puisse jouer son rôle auprès des participants.

## Critères d’acceptation

- [ ] Sur la page de détail d’un event, l’organisateur peut voir la liste des `EventParticipant` associés (au moins nom + rôle).
- [ ] Pour chaque participant (non organisateur), l’organisateur dispose d’une action “Définir comme encadrant” / “Promouvoir en encadrant”.
- [ ] Le clic sur cette action met à jour l’`EventParticipant` concerné avec `roleInEvent = ENCADRANT`.
- [ ] Un encadrant promu reste marqué `status = GOING` (on ne change pas son statut de participation).
- [ ] Un encadrant ne peut pas transformer lui-même son rôle ni celui des autres (cette action reste réservée à l’organisateur dans le MVP).
- [ ] Sur la page de détail d’un event, les encadrants apparaissent dans une section dédiée (“Encadrants”), au-dessus / à part de la liste de participants classiques.

## Notes techniques

- Endpoint typique : `POST /events/{eventId}/participants/{participantId}/role` avec un body `roleInEvent = ENCADRANT`.
- Vérifier que seul l’utilisateur `organiserId` de l’Event peut appeler cet endpoint.
- Côté UI, afficher un badge “Encadrant” pour les `EventParticipant` avec `roleInEvent = ENCADRANT`.

---

**Phase**: MVP  
**Level**: Story  
**Area**: Backend, Web/Mobile UI

---

# S1.2.3 – Affichage des rôles sur la page d’événement

## User Story

En tant que **participant**,  
quand je consulte la fiche d’un événement,  
je veux voir clairement qui organise et qui encadre,  
afin de savoir à qui m’adresser en cas de question et de me sentir encadré.

## Critères d’acceptation

- [ ] En haut de la page d’un événement, l’organisateur est mis en avant avec :
  - [ ] son nom,
  - [ ] son avatar (si disponible),
  - [ ] un label “Organisateur”.
- [ ] Juste en dessous, une section “Encadrants” liste les `EventParticipant` avec `roleInEvent = ENCADRANT`.
- [ ] Si aucun encadrant n’est défini, la section “Encadrants” peut être masquée ou afficher un message type “Encadrants : à venir”.
- [ ] La liste des participants “simples” (roleInEvent = PARTICIPANT) est distincte des encadrants, même si elle peut apparaître dans le même écran.
- [ ] Si l’utilisateur connecté est lui-même organisateur ou encadrant, cela est aussi visible via un badge “Vous êtes : Organisateur / Encadrant” sur la page.

## Notes techniques

- Endpoint `GET /events/{eventId}` doit déjà renvoyer les participants avec leur `roleInEvent`, ou un endpoint séparé `GET /events/{eventId}/participants`.
- Côté UI, structurer clairement :
  - bloc “Organisateur”
  - bloc “Encadrants”
  - bloc “Participants”.

---

**Phase**: MVP  
**Level**: Story  
**Area**: Web/Mobile UI

---

# S1.3.1 – Clôturer un événement

## User Story

En tant qu’**organisateur**,  
quand la sortie est terminée,  
je veux pouvoir marquer l’événement comme “terminé”,  
afin de figer la liste des participants et de basculer l’event dans l’historique.

## Critères d’acceptation

- [ ] Sur la page d’un événement, l’organisateur dispose d’une action “Clôturer l’événement” (visible uniquement pour les events non terminés).
- [ ] Le clic sur “Clôturer l’événement” demande une confirmation (ex. modal “Es-tu sûr de vouloir clôturer cette sortie ?”).
- [ ] Après confirmation, le `status` de l’Event passe à `COMPLETED`.
- [ ] Un événement `COMPLETED` :
  - [ ] n’apparaît plus dans la liste des événements à venir,
  - [ ] apparaît dans la liste d’historique des events pour l’organisateur et les participants.
- [ ] Une fois `COMPLETED`, l’événement ne peut plus être modifié (titre, date, lieu) dans le MVP.
- [ ] Le changement de status n’affecte pas les `EventParticipant` (on ne touche pas aux statuts `GOING`, `INVITED`, etc.).

## Notes techniques

- Endpoint typique : `POST /events/{eventId}/complete`.
- Vérifier que seul l’organisateur de l’event peut le clôturer.
- Penser à ajouter un index ou un filtre simple pour distinguer `PLANNED` vs `COMPLETED` dans les listes.

---

**Phase**: MVP  
**Level**: Story  
**Area**: Backend, Web/Mobile UI
