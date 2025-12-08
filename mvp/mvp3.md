# [EPIC] MVP-3 – Invitation & Accès (QR + code + interne)

## Description

Gérer tout ce qui permet à un utilisateur de rejoindre un événement The Run sans lien partagé :
- invitations internes d’utilisateurs déjà présents dans la base,
- QR code pour inscriptions rapides sur place,
- code court lisible et prononçable.

L’ensemble doit fonctionner aussi bien pour :
- des utilisateurs déjà inscrits à The Run,
- des nouveaux utilisateurs qui arrivent par QR / code (hook vers le mode invité / onboarding).

## Objectifs

- Permettre aux organisateurs d’inviter facilement des personnes connues dans The Run.
- Permettre aux participants de rejoindre un event en quelques secondes, surtout sur place.
- Supprimer la dépendance aux liens copiés/collés (WhatsApp, SMS) en gardant un accès contrôlé : QR + code court.
- Servir de base au “Mode accueil” (tablette / téléphone affichant le QR au point de rendez-vous).

---

# S3.1.1 – Recherche de User à inviter

## User Story

En tant qu’**organisateur**,  
quand je prépare un événement,  
je veux pouvoir rechercher des utilisateurs déjà présents dans The Run et les inviter,  
afin d’ajouter facilement à ma sortie les personnes avec qui je cours habituellement.

## Critères d’acceptation

- [ ] Depuis la fiche d’un `Event`, une section “Inviter des personnes” est disponible pour l’organisateur.
- [ ] Un champ de recherche permet de filtrer les utilisateurs par nom, pseudo ou email.
- [ ] La recherche renvoie une liste paginée avec au minimum : nom + (optionnel) avatar / email.
- [ ] L’organisateur peut, pour chaque résultat, choisir le rôle d’invitation : **Participant** ou **Encadrant**.
- [ ] La sélection crée (ou met à jour) une entrée `EventParticipant` avec `status = INVITED` et le bon `roleInEvent`.
- [ ] Un même utilisateur ne peut pas être invité deux fois pour le même event (la ligne existante est mise à jour, pas dupliquée).
- [ ] Seul l’organisateur de l’event peut accéder à l’interface d’invitation interne (MVP).

## Notes techniques

- Endpoint de type `GET /users?query=<term>&page=<n>` pour la recherche.
- Endpoint de type `POST /events/{eventId}/participants/invite` prenant `userId` + `roleInEvent`.
- Vérifier que le couple `(eventId, userId)` est unique dans `EventParticipant`.
- Prévoir pagination / limite de résultats pour la recherche.

---

**Phase**: MVP  
**Level**: Story  
**Area**: Backend, Web/Mobile UI

---

# S3.1.2 – Notification d’invitation

## User Story

En tant qu’**utilisateur invité**,  
quand un organisateur m’invite à un événement,  
je veux être notifié et pouvoir accepter ou refuser simplement,  
afin de gérer mes participations sans passer par des captures d’écran ou des messages privés.

## Critères d’acceptation

- [ ] Lorsqu’un `EventParticipant` avec `status = INVITED` est créé, une notification d’invitation est générée pour cet utilisateur.
- [ ] L’utilisateur voit un onglet ou une section **“Invitations”** listant les événements où il a `status = INVITED`.
- [ ] Chaque invitation affiche au minimum : nom de l’événement, date/heure, lieu, nom de l’organisateur.
- [ ] Depuis la carte d’invitation, l’utilisateur peut ouvrir le détail de l’événement.
- [ ] L’utilisateur peut cliquer sur un bouton “Je viens” qui passe `status = GOING` pour cet `EventParticipant`.
- [ ] L’utilisateur peut cliquer sur un bouton “Je ne viens pas” / “Refuser” qui passe `status = DECLINED`.
- [ ] Après acceptation ou refus, l’invitation disparaît de la liste “Invitations” et l’événement apparaît (ou non) dans les événements à venir.

## Notes techniques

- Notification in-app minimale (stockée en base) suffisante pour le MVP. L’email est optionnel.
- Endpoint de type `GET /me/invitations` pour récupérer les `EventParticipant` avec `status = INVITED`.
- Endpoint de type `POST /events/{eventId}/participants/{participantId}/respond` avec `status` = `GOING` ou `DECLINED`.
- Gérer les droits : seul l’utilisateur concerné peut répondre à son invitation.

---

**Phase**: MVP  
**Level**: Story  
**Area**: Backend, Web/Mobile UI

---

# S3.2.1 – Générer un QR unique pour un Event

## User Story

En tant qu’**organisateur**,  
quand je consulte la fiche d’un événement,  
je veux pouvoir afficher un QR code unique lié à cet event,  
afin de permettre aux participants de s’inscrire rapidement sur place en le scannant.

## Critères d’acceptation

- [ ] Chaque `Event` dispose d’un identifiant d’accès (token / code) permettant de le retrouver depuis une URL.
- [ ] Depuis la fiche d’un event, un bouton “Mode accueil / QR” est visible pour l’organisateur.
- [ ] En cliquant sur ce bouton, un écran plein écran affiche :
  - [ ] Le nom de l’événement.
  - [ ] L’heure de départ.
  - [ ] Le QR code.
- [ ] Le QR code encode une URL universelle du type `https://the.run/join/<EVENT_CODE>`.
- [ ] Le QR reste stable pour un même event (pas de changement à chaque ouverture).
- [ ] Option MVP : le QR est en lecture seule (pas de régénération de token dans le MVP).

## Notes techniques

- Le `<EVENT_CODE>` peut être le code court ou un token distinct ; il doit permettre de résoudre l’event côté backend.
- Génération du QR côté client (lib) ou côté backend (image) à décider selon stack.
- Prévoir que le même identifiant serve aussi au “code court” ou les distinguer (défini dans S3.3.1).

---

**Phase**: MVP  
**Level**: Story  
**Area**: Backend, Web/Mobile UI

---

# S3.2.2 – Scan du QR → rejoindre l’event

## User Story

En tant que **participant**,  
quand je scanne le QR code d’un événement,  
je veux arriver directement sur une interface simple pour rejoindre cet event,  
afin de pouvoir m’enregistrer en quelques secondes avant le départ.

## Critères d’acceptation

- [ ] Le QR code pointe vers une URL universelle `https://the.run/join/<EVENT_CODE>`.
- [ ] Si l’app est installée, la redirection ouvre l’écran natif de l’event via deep link (ex. `therun://event/<id>`).
- [ ] Si l’app n’est pas installée, la redirection ouvre une Web App légère `join/<EVENT_CODE>` (flux invité / PWA).
- [ ] L’écran (natif ou web) affiche a minima : titre de l’event, date/heure, lieu (adresse ou point sur carte).
- [ ] Un bouton “Je participe” est disponible sur cet écran.
- [ ] Si l’utilisateur est déjà logué :
  - [ ] Le clic sur “Je participe” crée ou met à jour un `EventParticipant` avec `status = GOING` et `roleInEvent = PARTICIPANT` (si pas déjà défini).
- [ ] Si l’utilisateur est inconnu (guest) :
  - [ ] L’écran invite à saisir un minimum d’infos (cf. §5.7 du CdC, géré dans l’EPIC Onboarding), puis crée un participant invité.
- [ ] À l’issue de l’action, l’utilisateur voit une confirmation claire (“C’est bon, tu participes à cet event”).

## Notes techniques

- Implémenter un endpoint `GET /join/<EVENT_CODE>` qui :
  - Résout l’event depuis le code,
  - Retourne les infos nécessaires pour l’écran “Rejoindre cet event”.
- Utiliser un mécanisme de deep link (schema custom) pour le mobile : `therun://event/<id>`.
- Le comportement guest vs user logué est aligné avec le flux “Onboarding Pressure Test” (EPIC Onboarding).

---

**Phase**: MVP  
**Level**: Story  
**Area**: Mobile, Web, Backend

---

# S3.3.1 – Créer un code court pour chaque event

## User Story

En tant qu’**organisateur**,  
quand je crée un événement,  
je veux qu’un code court lisible lui soit automatiquement attribué,  
afin de pouvoir le communiquer facilement à l’oral ou à l’écrit sans partager de lien.

## Critères d’acceptation

- [ ] À la création d’un `Event`, un champ `eventCode` (code court) est généré automatiquement.
- [ ] Le `eventCode` est unique à l’échelle de tous les events actifs.
- [ ] Le format du code est lisible et mémorisable (ex. 5–8 caractères alphanumériques, type `RUN510`, `EF08KM`).
- [ ] Le `eventCode` est visible sur la fiche de l’event pour l’organisateur.
- [ ] Le `eventCode` peut être copié facilement (tap/click pour copier).
- [ ] Par défaut dans le MVP, les participants et encadrants peuvent voir ce code pour le partager à d’autres.
- [ ] En cas de collision lors de la génération, un nouveau code est automatiquement généré (sans erreur visible côté utilisateur).

## Notes techniques

- Génération possible via un alphabet restreint (exclure O/0, I/1 pour éviter les confusions).
- Stockage dans `Event.eventCode` avec contrainte d’unicité en base.
- Le même `eventCode` peut être utilisé dans l’URL join (`/join/<EVENT_CODE>`) pour mutualiser code court et code de jonction.

---

**Phase**: MVP  
**Level**: Story  
**Area**: Backend, Web/Mobile UI

---

# S3.3.2 – Rejoindre via code

## User Story

En tant que **participant**,  
quand on me donne un code d’événement à l’oral ou par message,  
je veux pouvoir saisir ce code dans l’app,  
afin d’accéder à la fiche de l’event et de m’y inscrire sans QR ni lien.

## Critères d’acceptation

- [ ] L’app propose un écran “Rejoindre un événement” accessible depuis la navigation principale.
- [ ] Cet écran contient un champ de saisie pour le code d’événement (`eventCode`) et un bouton “Valider”.
- [ ] Lorsque l’utilisateur saisit un code valide :
  - [ ] L’app récupère l’événement correspondant via `eventCode`.
  - [ ] L’écran affiche la fiche de l’événement (titre, date/heure, lieu, organisateur, parcours disponibles).
  - [ ] Un bouton “Je participe” est disponible.
- [ ] Lorsque l’utilisateur saisit un code invalide :
  - [ ] Un message d’erreur clair est affiché (“Ce code ne correspond à aucun événement actif.”).
- [ ] Le bouton “Je participe” fonctionne comme dans le reste du flux :
  - [ ] Si user logué : création / mise à jour d’`EventParticipant` avec `status = GOING`.
  - [ ] Si guest : bascule vers le flux invité (cf. Onboarding).

## Notes techniques

- Endpoint de type `GET /events/by-code/{eventCode}` retournant les infos de l’event si trouvé.
- Réutiliser la même logique que pour le QR (scan → join) pour la partie “Je participe”.
- Gérer la casse du code (tout en majuscules ou insensible à la casse côté backend).

---

**Phase**: MVP  
**Level**: Story  
**Area**: Backend, Web/Mobile UI
