# [EPIC] MVP-5 – Notifications / Rappels & Broadcast simple

## Description

Mettre en place le socle de **notifications** de The Run :

- une infrastructure générique de notifications (modèle, stockage, types),
- des **rappels automatiques** pour participants et organisateurs avant la sortie,
- un **broadcast simple** permettant à l’organisateur d’envoyer un message descendant propre à tous les participants d’un event (sans transformer ça en WhatsApp 2.0).

Pas encore de “centre de messagerie” complet ni de chat de groupe :  
on vise des notifications **simples, unidirectionnelles, orientées information pratique** (retard, annulation, météo, rappel logistique).

## Objectifs

- S’assurer que personne n’oublie la sortie (rappels auto).
- Donner à l’organisateur un canal clair pour prévenir d’un imprévu (retard, changement).
- Poser un modèle de notification réutilisable pour les futures features (check-in, météo contextuelle, pub ciblée).
- Garder les échanges **structurés et propres**, à l’opposé du chaos WhatsApp.

---

# S5.1.1 – Modèle & infrastructure de notification

## User Story

En tant que **équipe produit/tech**,  
quand nous ajoutons des rappels et des broadcasts,  
nous voulons un modèle de notification unifié,  
afin de gérer tous les types de notifications (système, rappel, broadcast) de manière cohérente.

## Critères d’acceptation

- [ ] Un modèle `Notification` existe en base avec au minimum :
  - [ ] `id`,
  - [ ] `userId` destinataire,
  - [ ] `type` (`EVENT_REMINDER_PARTICIPANT`, `EVENT_REMINDER_ORGANISER`, `EVENT_BROADCAST`, …),
  - [ ] `title`,
  - [ ] `body`,
  - [ ] `eventId` (optionnel, si lié à un event),
  - [ ] `metadata` (JSON optionnel pour infos complémentaires),
  - [ ] `readAt` (null si non lu),
  - [ ] `createdAt`.
- [ ] Il existe un service applicatif qui permet de :
  - [ ] créer une notification pour un utilisateur,
  - [ ] marquer une notification comme “lue”,
  - [ ] lister les notifications d’un utilisateur.
- [ ] Les notifications peuvent être **affichées in-app** (au minimum via une liste simple).
- [ ] L’infrastructure permet, à terme, d’ajouter des canaux supplémentaires (email / push) sans casser le modèle.

## Notes techniques

- Endpoint(s) recommandés :
  - `GET /me/notifications`
  - `POST /me/notifications/{id}/read`
- `type` peut être une enum ou un string typé.
- Pas d’obligation d’implémenter email / push dans le MVP, mais prévoir les hooks (adapter layer).

---

**Phase**: MVP  
**Level**: Story  
**Area**: Backend

---

# S5.1.2 – Centre de notifications simple in-app

## User Story

En tant que **utilisateur**,  
quand je reçois des rappels ou messages d’organisateur,  
je veux pouvoir les retrouver dans un endroit unique dans l’app,  
afin de ne pas perdre une info importante (horaire, changement de lieu, message de sécurité).

## Critères d’acceptation

- [ ] L’app propose un écran “Notifications” accessible depuis la navigation principale (ou un icône cloche).
- [ ] Cet écran liste les notifications de l’utilisateur (issues de `Notification`) par ordre décroissant de `createdAt`.
- [ ] Pour chaque notification, on affiche :
  - [ ] le titre,
  - [ ] un extrait du contenu (`body`),
  - [ ] la date/heure d’envoi,
  - [ ] un indicateur de lecture (non lu / lu).
- [ ] Un tap sur une notification :
  - [ ] la marque comme lue,
  - [ ] et si l’item est associé à un `eventId`, redirige vers la page de l’événement.
- [ ] Un badge (ou un point) indique le nombre de notifications non lues dans la navigation (cloche ou menu).

## Notes techniques

- Réutilise les endpoints de S5.1.1.
- La mise à jour du badge peut être gérée via un champ “unreadCount” dans la payload `GET /me/notifications` ou via un endpoint dédié.
- Le design reste simple en MVP, la priorité est la lisibilité.

---

**Phase**: MVP  
**Level**: Story  
**Area**: Web/Mobile UI, Backend

---

# S5.2.1 – Rappel automatique aux participants avant l’événement

## User Story

En tant que **participant inscrit**,  
quand l’heure de la sortie approche,  
je veux recevoir un rappel automatique,  
afin de ne pas oublier et d’avoir les infos essentielles sous la main.

## Critères d’acceptation

- [ ] Un job planifié identifie régulièrement les événements à venir dans une fenêtre donnée (ex. H-2).
- [ ] Pour chaque `Event` dans cette fenêtre, le système récupère les `EventParticipant` avec :
  - [ ] `status = GOING`.
- [ ] Pour chaque participant concerné :
  - [ ] une `Notification` de type `EVENT_REMINDER_PARTICIPANT` est créée avec :
    - [ ] titre (ex. “Rappel – Sortie de ce soir”),
    - [ ] contenu minimum : titre de l’event, heure de départ, lieu, éventuellement parcours/groupe.
- [ ] Ces notifications apparaissent dans :
  - [ ] la liste “Notifications”,
  - [ ] et peuvent déclencher, plus tard, du push / email (non obligatoire en MVP).
- [ ] Aucun rappel n’est créé pour :
  - [ ] `status = DECLINED`,
  - [ ] `status = INVITED` ou `MAYBE`.
- [ ] Le même participant ne reçoit **qu’un seul** rappel par événement.

## Notes techniques

- Job type cron (ex. toutes les 10 minutes) :
  - récupère les events avec `startDateTime` dans un intervalle `[now + 2h, now + 2h + δ]`.
- Flag possible sur `EventParticipant` ou dans `Notification` pour éviter les doublons (`reminderSent`).
- S’appuie sur le modèle `Notification` de S5.1.1.

---

**Phase**: MVP  
**Level**: Story  
**Area**: Backend (jobs/cron), Notifications

---

# S5.2.2 – Rappel organisateur avec résumé des participants

## User Story

En tant qu’**organisateur**,  
quand l’heure de ma sortie approche,  
je veux recevoir un rappel avec un résumé des participants et des groupes,  
afin d’arriver préparé et de savoir à quoi m’attendre sur place.

## Critères d’acceptation

- [ ] Un job planifié identifie les événements à venir pour lesquels un rappel organisateur doit être envoyé (ex. H-3).
- [ ] Pour chaque event, le système :
  - [ ] récupère l’`organiserId`,
  - [ ] calcule un résumé des participants :
    - [ ] total `GOING`,
    - [ ] répartition par Parcours (`EventRoute`),
    - [ ] répartition par Groupe d’allure (`EventGroup`) si présents.
- [ ] Une `Notification` de type `EVENT_REMINDER_ORGANISER` est créée pour l’`organiserId` avec un `body` contenant ce résumé.
- [ ] Le rappel n’est pas envoyé si :
  - [ ] l’événement est déjà `COMPLETED` ou `CANCELLED`,
  - [ ] l’événement n’a aucun participant `GOING` (MVP : on peut envoyer un message différent en V1).
- [ ] Le rappel organisateur est unique par événement (pas de duplicata).

## Notes techniques

- Peut partager une grande partie de la logique avec S5.2.1.
- Réutiliser les agrégations déjà prévues pour la vue synthèse (MVP-4 S4.2.2).
- Flag `organiserReminderSent` sur `Event` ou utilisation d’une requête sur `Notification` existante.

---

**Phase**: MVP  
**Level**: Story  
**Area**: Backend (jobs/cron), Notifications

---

# S5.3.1 – Broadcast simple de l’organisateur à tous les participants

## User Story

En tant qu’**organisateur**,  
quand je dois prévenir les participants d’un imprévu (retard, changement de point de RDV, info sécurité),  
je veux pouvoir envoyer un message unique à tous les participants de l’événement,  
afin de les informer sans passer par un groupe WhatsApp ingérable.

## Critères d’acceptation

- [ ] Sur la page d’un `Event`, l’organisateur dispose d’une action “Envoyer un message aux participants”.
- [ ] Le clic ouvre un écran / modal avec :
  - [ ] un champ “Titre” (optionnel ou pré-rempli),
  - [ ] un champ “Message” texte.
- [ ] À la validation :
  - [ ] Pour chaque `EventParticipant` avec `status != DECLINED`, une `Notification` de type `EVENT_BROADCAST` est créée :
    - [ ] `userId` = participant,
    - [ ] `eventId` = id de l’event,
    - [ ] `title` = titre du message ou “Message de l’organisateur”,
    - [ ] `body` = contenu saisi par l’organisateur.
- [ ] Ces notifications apparaissent dans la liste “Notifications” des participants.
- [ ] L’organisateur voit un message de confirmation (“Ton message a été envoyé à X participants”).
- [ ] Seuls l’organisateur (et éventuellement encadrants en V1) peuvent utiliser cette fonction – pas les participants.

## Notes techniques

- Endpoint : `POST /events/{eventId}/broadcast` avec payload `{ title?, body }`.
- Vérifier les permissions : `userId` doit être `organiserId` de l’event (MVP).
- Possibilité de limiter la longueur du message pour éviter le pavé (ex. 500–1000 caractères).

---

**Phase**: MVP  
**Level**: Story  
**Area**: Backend, Web/Mobile UI, Notifications

---

# S5.3.2 – Notifications automatiques sur changements critiques (heure/lieu/annulation)

## User Story

En tant que **participant**,  
quand l’heure ou le lieu de la sortie change, ou que l’événement est annulé,  
je veux être automatiquement notifié,  
afin de ne pas me pointer au mauvais endroit ou à la mauvaise heure.

## Critères d’acceptation

- [ ] Lorsqu’un `Event` est modifié par l’organisateur sur un champ critique :
  - [ ] `startDateTime` (heure/date),
  - [ ] `locationName` ou coordonnées (lieu),
  - [ ] ou `status` passe à `CANCELLED`,
    alors le système déclenche une notification pour les participants concernés.
- [ ] Pour chaque `EventParticipant` avec `status = GOING` ou `INVITED` :
  - [ ] une `Notification` de type :
    - `EVENT_CHANGED_TIME` si seule l’heure/date a changé,
    - `EVENT_CHANGED_LOCATION` si seul le lieu a changé,
    - `EVENT_CANCELLED` si l’event est annulé,
    - ou combiné si plusieurs champs changent (simplification possible : un type “EVENT_UPDATED” avec un message détaillé).
- [ ] Les messages générés contiennent au minimum :
  - [ ] le titre de l’event,
  - [ ] l’ancienne valeur (ex. “Initialement prévu à 19h00”),
  - [ ] la nouvelle valeur (ex. “Nouvelle heure : 19h30”),
  - [ ] une incitation à vérifier la fiche d’event (“Voir les détails”).
- [ ] Ces notifications sont visibles dans la liste “Notifications” et, idéalement, dans une bannière sur la fiche event (“Cet événement a été modifié le …”).

## Notes techniques

- Implémenter un hook / middleware sur la mise à jour de `Event` :
  - comparer l’état avant/après,
  - détecter les changements critiques.
- Endpoint modification événement : `PATCH /events/{eventId}` doit passer par ce hook.
- Utiliser le service de notification de S5.1.1 pour créer les notifications en masse.
- Attention aux modifications multiples successives : possibilité d’agréger en V1 (MVP : notifications multiples tolérées).

---

**Phase**: MVP  
**Level**: Story  
**Area**: Backend, Notifications, Web/Mobile UI
