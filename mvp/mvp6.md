# [EPIC] MVP-6 – Onboarding & Guest Web (Pressure Test)

## Description

Concevoir l’**entrée dans The Run** dans les conditions les plus dures :
- participant qui scanne un **QR code** 3 minutes avant le départ,
- sous la pluie,
- téléphone verrouillé, app non installée, pas de compte.

L’EPIC couvre :

- Le **flux Web “join/EVENT_CODE”** ultra-léger (PWA / Web App) pour les invités.
- La création de **comptes Guest** (isGuest) à la volée, liés à un Event.
- La **fusion** ultérieure d’un Guest avec un compte complet (email).
- La **redirection intelligente** App installée vs non installée.
- Le respect de la promesse : *“check-in en < 30 secondes”*.

## Objectifs

- Garantir qu’un runner puisse se **marquer présent** sur un event en quelques secondes, même sans app.
- Éviter de perdre des participants à cause d’un onboarding trop lourd.
- Poser les bases techniques pour :
  - deep links,
  - gestion des Guests,
  - fusion de compte,
  - future collecte de consentement (data / pub) sans bloquer le run.

---

# S6.1.1 – Page Web `join/EVENT_CODE` (landing invité)

## User Story

En tant que **participant sans app installée**,  
quand je scanne le QR code d’un événement,  
je veux arriver sur une page Web ultra-simple dédiée à cet événement,  
afin de comprendre où je suis et pouvoir rejoindre rapidement la sortie.

## Critères d’acceptation

- [ ] Le QR code d’un Event pointe vers une URL de type `https://the.run/join/<EVENT_CODE>`.
- [ ] Si l’app n’est pas installée, le scan ouvre cette URL dans le navigateur mobile (Web App légère).
- [ ] La page `join/<EVENT_CODE>` affiche :
  - [ ] le titre de l’événement,
  - [ ] la date et l’heure de départ,
  - [ ] le lieu (nom + indication rapide),
  - [ ] l’organisateur (nom / pseudo),
  - [ ] un CTA principal “Je rejoins cette sortie”.
- [ ] Si `EVENT_CODE` est invalide ou expiré :
  - [ ] une page d’erreur claire s’affiche (“Événement introuvable ou expiré” + CTA retour).
- [ ] La page est optimisée pour mobile (layout simple, pas de scroll inutile, gros bouton action).

## Notes techniques

- Endpoint backend : `GET /public/events/by-code/{eventCode}` retournant les infos publiques nécessaires.
- La page Web doit pouvoir fonctionner comme PWA/SPA minimale mais le MVP peut être SSR ou simple page.
- Détection “app installée” vs non installée pourra être gérée par un mécanisme séparé (schema URL / deep link), mais ici on se concentre sur le cas “Web First”.

---

**Phase**: MVP  
**Level**: Story  
**Area**: Web (PWA), Backend (public API)

---

# S6.1.2 – Flux “Guest Join” : Je rejoins en 30 secondes

## User Story

En tant que **participant sans compte**,  
quand j’arrive sur la page Web join d’un event,  
je veux pouvoir me déclarer présent avec un minimum d’infos,  
afin d’être inscrit à la sortie sans devoir créer immédiatement un compte complet.

## Critères d’acceptation

- [ ] Sur la page `join/<EVENT_CODE>`, le CTA “Je rejoins cette sortie” ouvre un formulaire minimal :
  - [ ] Champ “Prénom” (obligatoire),
  - [ ] Champ “Nom (initiale)” ou “Nom complet” (optionnel ou minimal),
  - [ ] Champ “Email” (optionnel mais recommandé, avec texte explicatif).
- [ ] L’utilisateur peut valider le formulaire en quelques secondes (max 1 écran).
- [ ] À la validation :
  - [ ] Si aucun `User` n’existe avec cet email :
    - [ ] un `User` est créé avec un flag `isGuest = true`,
    - [ ] un `EventParticipant` est créé ou mis à jour avec :
      - `status = GOING`,
      - `roleInEvent = PARTICIPANT`.
  - [ ] Si un `User` existe déjà avec cet email :
    - [ ] un `EventParticipant` est créé / mis à jour pour ce `userId`.
- [ ] L’utilisateur est redirigé vers un écran de succès :
  - [ ] “C’est tout bon, tu es inscrit à cette sortie”,
  - [ ] rappel de l’heure et du lieu,
  - [ ] éventuellement un bouton “Voir les groupes / parcours” (lecture seule en MVP Web).
- [ ] Le temps total du flux “scan → inscrit” doit être compatible avec le Pressure Test (< 30s pour un utilisateur moyen).

## Notes techniques

- Endpoint : `POST /public/events/{eventId}/guest-join` prenant `{ firstName, lastName?, email? }`.
- Générer un `User` minimal :
  - `isGuest = true`,
  - pas de mot de passe dans le flux MVP Web : l’auth réelle sera gérée plus tard côté app.
- Si email absent, le Guest est identifié uniquement par un identifiant interne (attention : fusion plus difficile ensuite mais acceptable en MVP).

---

**Phase**: MVP  
**Level**: Story  
**Area**: Backend, Web (PWA)

---

# S6.1.3 – Fusion du compte Guest avec un compte complet

## User Story

En tant que **runner invité**,  
quand j’installe plus tard l’app The Run et crée un vrai compte,  
je veux récupérer mes événements et historiques liés à mon profil invité,  
afin de ne pas “perdre” mes participations précédentes.

## Critères d’acceptation

- [ ] Lors de la création d’un compte complet dans l’app (ou première connexion via email), si un ou plusieurs `User` Guest existent avec le même email :
  - [ ] les données pertinentes sont fusionnées :
    - [ ] `EventParticipant` liés au Guest sont réassignés au compte complet,
    - [ ] les autres éléments liés au Guest (ex. futur gear) sont transférés.
- [ ] Le `User` Guest est ensuite :
  - [ ] soit supprimé,
  - [ ] soit marqué comme “mergedIntoUserId” (selon stratégie).
- [ ] Après fusion, l’utilisateur, depuis l’app, voit :
  - [ ] les événements passés auxquels il a participé en tant qu’invité.
- [ ] Aucun doublon de participation n’est créé (un seul `EventParticipant` par `(eventId, userId)`).

## Notes techniques

- Fonction de fusion côté backend :
  - `mergeGuestIntoUser(guestUserId, realUserId)`.
- Le flux d’inscription app demandera l’email ; si un compte `isGuest = true` existe, proposer une récupération :
  - mais pour le MVP, une fusion silencieuse côté backend sur email peut suffire.
- Bien tracer la fusion pour debug (logs / table d’audit).

---

**Phase**: MVP  
**Level**: Story  
**Area**: Backend, Mobile (auth flow)

---

# S6.2.1 – Redirection intelligente App vs Web depuis le QR

## User Story

En tant que **participant**,  
quand je scanne un QR The Run,  
je veux que l’expérience s’adapte automatiquement selon que l’app est installée ou non,  
afin de ne pas me retrouver dans une impasse technique.

## Critères d’acceptation

- [ ] Le QR code encode une URL universelle (`https://the.run/join/<EVENT_CODE>`).
- [ ] Si l’app est **déjà installée** :
  - [ ] le scan (via appareil photo ou navigateur) permet d’ouvrir directement l’app via un **deep link** (ex. `therun://event/<EVENT_CODE>`),
  - [ ] l’utilisateur arrive sur la fiche d’event native avec un bouton “Je participe”.
- [ ] Si l’app n’est **pas installée** :
  - [ ] l’URL s’ouvre dans le navigateur mobile,
  - [ ] la Web App `join/<EVENT_CODE>` (S6.1.1) s’affiche.
- [ ] Comportement cohérent sur iOS et Android (dans la limite des possibilités du MVP) :
  - [ ] documentation interne du comportement par OS (par ex. Universal Links iOS, intent-filter Android).

## Notes techniques

- Mise en place :
  - iOS : Universal Links liant `https://the.run/join/*` à l’app,
  - Android : intent-filter avec schéma et host correspondant.
- MVP : priorité à la robustesse ; si le deep link échoue, fallback sur la Web App.
- La même URL peut contenir des infos additionnelles (paramètre `?source=qr`).

---

**Phase**: MVP  
**Level**: Story  
**Area**: Mobile, Web, Infra (deep links)

---

# S6.2.2 – Premier lancement de l’app depuis un QR (compléter le profil)

## User Story

En tant que **participant invité**,  
quand j’installe l’app The Run après avoir scanné un QR,  
je veux être renvoyé automatiquement sur la fiche de l’événement concerné après l’onboarding minimal,  
afin de comprendre pourquoi j’ai installé l’app et finaliser mon inscription.

## Critères d’acceptation

- [ ] Si l’utilisateur arrive sur le store depuis un lien `join/<EVENT_CODE>` :
  - [ ] après installation et ouverture de l’app, l’app garde en mémoire l’`EVENT_CODE` d’origine.
- [ ] Au premier lancement de l’app :
  - [ ] un onboarding minimal est présenté (nom, email, mot de passe / SSO selon choix ultérieur),
  - [ ] l’utilisateur crée un compte complet.
- [ ] Une fois l’onboarding terminé :
  - [ ] l’app ouvre automatiquement la fiche de l’événement associé à `EVENT_CODE`,
  - [ ] si l’utilisateur était déjà Guest avec ce mail, la fusion S6.1.3 est lancée.
- [ ] Si `EVENT_CODE` est invalide ou expiré :
  - [ ] l’app ouvre la home standard avec un message simple (“L’événement n’est plus disponible”).

## Notes techniques

- Mécanisme de “pending deep link” :
  - stocker localement `EVENT_CODE` dans un paramètre à l’installation (via les mécanismes iOS/Android / smart app banner),
  - ou passer par un backend qui garde trace d’un “install token” (plus complexe, peut être V1).
- MVP pragmatique : utiliser la Web App comme trampoline :
  - Lien “Installer l’app” ajoute `?event=<EVENT_CODE>` dans une URL spéciale, qui configure les stores / deep link selon les possibilités.

---

**Phase**: MVP  
**Level**: Story  
**Area**: Mobile, Auth, Deep links

---

# S6.3.1 – Onboarding minimal & consentement de base

## User Story

En tant que **nouvel utilisateur**,  
quand j’installe The Run hors contexte QR (ou après),  
je veux un onboarding simple qui me demande l’essentiel,  
afin de pouvoir utiliser l’app rapidement tout en sachant comment mes données seront utilisées.

## Critères d’acceptation

- [ ] L’onboarding app demande au minimum :
  - [ ] Prénom (obligatoire),
  - [ ] Email (obligatoire pour compte complet),
  - [ ] Mot de passe ou méthode de connexion choisie (SSO, etc.).
- [ ] Une étape de consentement simple est présentée (MVP) :
  - [ ] case à cocher “J’accepte les CGU / Politique de confidentialité”,
  - [ ] mention claire que les données de pratique peuvent être agrégées de façon anonymisée (cf. CdC).
- [ ] L’utilisateur peut terminer l’onboarding en quelques écrans (idéalement 2–3 écrans max).
- [ ] Une fois l’onboarding terminé :
  - [ ] s’il existe un `User` Guest avec le même email, la fusion S6.1.3 est déclenchée,
  - [ ] s’il y a un deep link d’event en attente, l’app redirige vers cet event (S6.2.2),
  - [ ] sinon, l’app ouvre la home standard (liste d’événements / onglet principal).

## Notes techniques

- L’écran de consentement détaillé (RGPD complet, choix fins A/B/C) peut venir en V1, ici on se limite à une case globale.
- Backend :
  - création d’un `User` avec `isGuest = false`,
  - copie / fusion des données éventuelles du Guest.
- Prévoir un champ `acceptedTermsAt` sur `User`.

---

**Phase**: MVP  
**Level**: Story  
**Area**: Mobile, Backend (auth & users)
