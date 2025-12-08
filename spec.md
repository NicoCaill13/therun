# Cahier des Charges – The Run (Draft)

## 1. Vision Produit

### 1.1. Objectif

The Run est une application qui permet à un organisateur de sorties running
d’organiser des séances “comme un pro” : informations claires, parcours définis,
groupes de niveau, participants visibles, sans le chaos des conversations WhatsApp.

### 1.2. Persona principal (MVP)

- **Rôle** : organisateur de sorties (capitaine de run, coach, kiné, responsable run & drink, etc.)
- **Profil** :
  - Runner régulier
  - Un peu geek / structuré
  - Il organise souvent des sorties et en a marre de gérer :
    - Des questions répétitives (“On part d’où ?”, “Quelle allure ?”)
    - Des groupes WhatsApp illisibles
    - Des parcours stockés partout (Strava, GPX, photos, etc.)

### 1.3. Promesse

> En 2 minutes, tu crées une sortie propre, avec parcours, niveaux et liste de participants.  
> À l’heure du rendez-vous, tout le monde sait où aller et à quelle allure courir.

---

## 2. Fonctionnalités Cœur (MVP Fonctionnel)

### 2.1. Création d’une sortie

- Saisie :
  - Titre de la sortie
  - Date & heure
  - Lieu de rendez-vous (adresse + point sur carte)
  - Distance cible (ex : 8 km)
  - Description courte
- Options :
  - Création de **groupes d’allure** (ex : 8–9 km/h, 10–11 km/h, 12+ km/h)
- Résultat :
  - Une **page d’événement accessible** via :
    - invitations internes,
    - QR code d’événement,
    - code d’événement (cf. §5).

### 2.2. Parcours associé à la sortie

- L’organisateur doit pouvoir :
  - **Créer un parcours** pour la sortie :
    - soit en dessinant sur la carte (polyligne simple),
    - soit en important un GPX (option MVP+ si simple à intégrer).
- Ce parcours est :
  - Affiché sur la carte dans l’écran “Tracé”
  - Stocké comme un **parcours réutilisable** (voir §2.3)

### 2.3. Bibliothèque de parcours (mutualisée par zone)

- **Principe** :
  - Chaque sortie publiée avec un parcours **crée un “parcours” dans la bibliothèque**.
  - Les parcours alimentent une **bibliothèque globale mutualisée par zone**.
  - L’accès à cette bibliothèque (lecture, recherche) dépend ensuite de l’offre (Free / Premium, cf. §6).

- Fonctionnement :
  - Un “Parcours” contient :
    - Polyligne (points GPS)
    - Distance
    - Dénivelé approx (si dispo)
    - Zone géographique (centre + rayon)
    - Tags éventuels (ex : “route”, “trail”, “plat”, “cassant”)
  - Les parcours sont **mutualisés** :
    - Si tu crées tous les mardis une EF de 8 km au même endroit, tu n’as pas à redessiner à chaque fois.

- Usage clé (reco automatique) :
  - Lors de la création d’une nouvelle sortie :
    - Si tu renseignes :
      - un **lieu de départ** approximatif
      - une **distance cible** (ex : 8 km)
    - L’application propose :
      > “Parcours suggérés près de toi – 8 à 10 km”
    - Tu peux sélectionner un parcours existant plutôt que tout recréer.

### 2.4. Gestion des participants (RSVP)

- Page d’événement :
  - Bouton “Je participe”
  - Choix du groupe d’allure (si défini)
- Côté organisateur :
  - Vue liste des participants :
    - Nom / groupe / statut
  - Vue synthèse :
    - Total participants
    - Répartition par groupe

### 2.5. Rappels

- Participants :
  - Rappel X heures avant la sortie (configurable plus tard, fixe au début, ex 2h avant).
- Organisateur :
  - Rappel avec résumé :
    - “Tu as 12 participants confirmés : 5 en 8–9 km/h, 7 en 10–11 km/h.”

### 2.6. Historique & réutilisation

- Après l’événement :
  - La sortie passe en “terminée”
  - Le(s) parcours reste(nt) dans la bibliothèque
- L’organisateur peut :
  - Dupliquer une sortie passée (reprendre même parcours, adapter date/heure)


### 2.7. Post-Run & Synchronisation Strava (MVP+)

The Run se concentre sur le **“avant”**, mais doit créer un pont naturel vers l’“après” sur Strava & co.

#### Objectif

- Faire de The Run le **point d’entrée** de la sortie,  
  puis laisser les participants continuer leur vie sur Strava, Garmin, etc.
- Utiliser cet “après” comme **canal d’acquisition viral**.

#### 2.7.1. Connexion compte Strava (côté utilisateur)

- Depuis son profil, l’utilisateur peut :
  - Connecter son compte Strava (OAuth).
- Permissions minimales :
  - Créer / modifier le titre d’une activité,
  - Ajouter une description,
  - (Évolutif) Ajouter des tags / “athletes” participants si Strava le permet.

#### 2.7.2. Logique post-événement (organisateur & participants)

- Quand un événement est marqué **“terminé”** :
  - The Run propose aux participants connectés à Strava :
    - soit une **notification in-app**,
    - soit un **rappel** type :
      > “Tu as participé à ‘Run & Drink du jeudi’.  
      > Veux-tu renommer ton activité Strava pour refléter cet event ?”

- Actions possibles :
  - **Renommer l’activité Strava** avec un template :
    - ex. : `The Run – [Nom de l'événement]`
  - **Ajouter une description** type :
    > “Sortie organisée avec The Run – gestion des parcours & groupes d’allure.”

(Évolutif) :

- Ajouter un lien profond (deep link) vers la page publique de l’événement The Run.
- Taguer automatiquement les autres participants (si supporté par l’API et autorisé).

#### 2.7.3. Bénéfice produit

- Pour les runners : ils gardent Strava comme “diary” principal.
- Pour The Run : l’app apparaît dans le **flux Strava des participants** → acquisition organique.

#### 2.7.4. Implémentation technique de la synchro (Spécifications MVP+)

Pour que la magie opère (“Renommer mon activité Strava”), la gestion de l’API Strava est asynchrone et robuste.

**A. Scopes OAuth requis**

Lors de la connexion Strava (`/oauth/authorize`), demander au minimum :

- `activity:read` (pour détecter la création d’une activité),
- `activity:write` (pour renommer la sortie et mettre à jour la description).

**B. Détection de l’activité (Webhooks)**

Pour éviter le polling :

1. L’utilisateur court et synchronise sa montre avec Strava.
2. Strava envoie une notification POST à notre backend :
   - `object_type: "activity"`,
   - `aspect_type: "create"`,
   - `owner_id: <strava_athlete_id>`.
3. Le backend reçoit l’alerte et récupère l’activité détaillée via l’API Strava.

**C. Algorithme de Matching (“Est-ce bien notre sortie ?”)**

À réception du webhook, la logique de matching minimale :

1. Vérifier si l’utilisateur (`owner_id`) a un `EventParticipant` avec `status = GOING`
   sur un événement The Run pour le même jour.
2. **Matching temporel** :
   - comparer `start_date_local` de l’activité Strava à l’heure de l’événement,
   - tolérance : par exemple ±30 minutes (configurable, max ±1h).
3. (MVP+) **Matching géographique** :
   - vérifier si le point de départ de l’activité Strava est dans un rayon d’environ 500 m
     du lieu de rendez-vous de l’`Event`.

Si les conditions sont réunies → on considère que l’activité correspond à cet événement.

**D. Mise à jour de l’activité (écriture Strava)**

Si le matching est positif, le backend envoie un `PUT /activities/{id}` à l’API Strava avec :

- `name` :
  - `The Run – [Nom de l'événement] ⚡️`
- `description` :
  - Texte type, par exemple :
    > `Sortie officielle organisée avec The Run. Groupe : [allure choisie].`  
    > `Retrouve les détails de l’événement ici : [DeepLink The Run].`

(Évolutif) : ajout de tags, d’emojis, ou d’informations sur le parcours.

**E. Gestion des Rate Limits**

- Les limites Strava imposent un débit d’écriture contrôlé.
- En cas d’événement avec beaucoup de participants :
  - les mises à jour sont envoyées via une **queue** (file de messages),
  - on lisse les appels dans le temps pour ne pas dépasser les quotas,
  - en cas de saturation, la synchro est réessayée plus tard (retry backoff).

> Point clé : le **matching temporel** est critique pour éviter de renommer
> un footing du matin avec le nom de l’event du soir.


### 2.8. Communication descendante (Broadcast organiser → participants)

The Run remplace le groupe WhatsApp pour la partie **organisation**, mais l’organisateur doit pouvoir communiquer simplement des infos critiques.

#### 2.8.1. Canal de notification d’événement

- Chaque `Event` possède un **canal de communication descendant** :
  - Visible dans la fiche d’événement (section “Messages de l’organisateur”).
  - Alimenté uniquement par :
    - l’**organisateur**,
    - les **encadrants** (option activable).

#### 2.8.2. Types de messages

- Types (MVP) :
  - “Info” (par défaut) : ex. “On part bien à 19h05.”
  - “Changement important” : ex. “Lieu de rendez-vous déplacé au parking B.”
  - “Annulation” (lié au statut de l’event, cf. §2.10).

- Règles :
  - **Les participants ne peuvent pas répondre** dans ce canal (pas de flood).
  - Éventuellement réaction par emoji (MVP+).

#### 2.8.3. Notifications

- Lorsqu’un message est publié :
  - Push notification pour tous les participants `status = GOING` (et éventuellement `MAYBE`).
  - Mise en avant du message dans la fiche d’événement (dernier message en haut, type “bandeau”).

> Objectif : remplacer les “désolé je suis en retard 5 min” sur WhatsApp,  
> sans recréer un chat ingérable.

### 2.9. Sécurité & Check-in réel (MVP / MVP+)

Particulièrement important pour les sorties trail, nocturnes ou en zones isolées.

#### 2.9.1. Check-in de départ

- Lors du scan du **QR code sur place** (cf. §5.3) :
  - The Run marque le participant comme :
    - `presentAtStart = true`
    - et associe l’heure réelle de check-in (`checkedInAt`).

- Côté organisateur :
  - Vue “Présents au départ” :
    - Liste des participants attendus vs présents,
    - Possibilité de filtrer par parcours / groupe d’allure.

#### 2.9.2. Check-out / “Je suis rentré”

- À la fin de sa sortie, le participant peut cliquer sur :
  - Bouton **“Je suis rentré”** sur la fiche de l’événement.
- The Run enregistre :
  - `finished = true`
  - `finishedAt` (heure de retour).

- Côté organisateur :
  - Vue “Suivi de retour” :
    - Nombre de participants “rentrés”,
    - Liste des participants non encore marqués comme rentrés.

#### 2.9.3. Cas d’alerte (MVP+)

- (Évolutif) Si un participant n’est pas rentré X heures après l’heure prévue :
  - L’organisateur peut voir sa **dernière position connue** (si partage de localisation activé au niveau utilisateur).
  - Possibilité d’un bouton :
    - “Signaler un problème” (usage à définir, pas de contact direct avec secours dans le MVP).

> Cette brique pose les bases d’une vraie **dimension sécurité** qui peut être valorisée auprès des clubs, stations, organisateurs outdoor.

### 2.10. Météo & Gestion de l’annulation

La météo est un élément clé pour décider : “Je viens / je ne viens pas” et pour choisir son équipement.

#### 2.10.1. Météo intégrée à l’événement (UX)

- Pour chaque `Event` :
  - The Run interroge une API météo externe avec :
    - coordonnées du lieu de rendez-vous,
    - heure / date de départ.
- Sur la fiche d’événement, affichage de :
  - température prévue,
  - ressenti,
  - condition principale (pluie, neige, vent fort…),
  - éventuellement un simple pictogramme.

- Mise à jour régulière (ex. toutes les 3h dans les 24–48h avant l’event).

#### 2.10.2. Annulation / modification d’un événement

- L’organisateur peut :
  - **Annuler** un événement,
  - **Modifier** certains paramètres clés (date, heure, lieu).

- Effets :
  - Statut de l’event :
    - `status = CANCELLED` ou `status = UPDATED`.
  - Historique des changements (MVP+).
  - Notifications automatiques :
    - push à tous les participants `status = GOING` / `MAYBE`,
    - message “système” dans le canal Broadcast (cf. §2.8).

- UX participant :
  - Badge visible sur l’événement :
    - “Annulé” ou “Reporté au [nouvelle date]”.
  - Option pour **retirer l’événement du “calendrier perso”** (MVP+).

> L’intégration météo sert à la fois l’UX (préparation) et la monétisation (triggers de campagnes, cf. §7.4.2).

### 2.11. Matériel & gestion des équipements (Gear) (MVP / MVP+)

Le “matériel” est une brique transversale qui sert à la fois :

- l’UX runner (suivi de l’usure des chaussures, rotation, alertes),
- la monétisation (campagnes ciblées, cf. §7.4.1),
- le produit data RunGraph (insights sur la durée de vie réelle, cf. §8.3.3).

#### 2.11.1. Objectifs

- Permettre à chaque runner de déclarer et suivre ses **chaussures** (et plus tard d’autres équipements).
- Associer le matériel aux **événements/activités** pour estimer les km parcourus.
- Alimenter les triggers produits (“Chaussures usées”) et les analyses RunGraph.

#### 2.11.2. Entités & modèle conceptuel

- `Gear` (matériel) :
  - `id`
  - `userId` → `User`
  - `type` : `SHOE` | `TRAIL_SHOE` | `RACING_SHOE` | (évolutif : `WATCH`, `BACKPACK`, etc.)
  - `label` (nom libre saisi par l’utilisateur, ex. “Pegasus 40 route”)
  - `brand` (optionnel)
  - `model` (optionnel)
  - `surface` : `ROAD` | `TRAIL` | `MIXED` (optionnel)
  - `startDate` (date de première utilisation)
  - `retiredAt` (date de mise au rebut / “retrait” de la paire)
  - `targetKilometers` (objectif théorique, ex. 600 km)
  - `trackedKilometers` (km calculés via événements/activités)
  - `isActive` (bool : paire encore en usage)

- Lien avec la participation à un événement :

  - `EventParticipantGear` (MVP+ simple ou champ sur EventParticipant) :
    - `eventParticipantId` → `EventParticipant`
    - `gearId` → `Gear`
    - rôle : “chaussure utilisée sur cet event”.

> En MVP strict, on peut calculer les km uniquement à partir des activités Strava (si connectées).  
> En V1+, on ajoute la sélection de la paire directement dans l’expérience The Run.

#### 2.11.3. UX “Mes chaussures”

- Section dédiée dans le profil utilisateur :
  - Liste des `Gear` de type `SHOE` :
    - nom, type, km cumulés, % d’usure estimé.
- Actions utilisateur :
  - **Ajouter une paire** :
    - type de chaussure, label, date de début, éventuellement objectif km.
  - **Marquer comme retirée** (“Je ne l’utilise plus”) :
    - renseigne `retiredAt` et fige les km.

- Affichage :
  - Barre ou jauge d’usure :
    - par ex. 480 / 600 km (80 %).
  - Badge d’état :
    - “OK”, “À surveiller”, “À remplacer” (seuils configurables, ex. 70 % / 90 %).

#### 2.11.4. Association aux événements & activités

Deux sources de vérité possibles :

1. **Via Strava (MVP+)** :
   - Si l’activité Strava est associée à une chaussure Strava,
   - et qu’une correspondance a été définie entre ce modèle et un `Gear` The Run,
   - alors les km sont synchronisés automatiquement.

2. **Via The Run (V1+)** :
   - Lors de la participation à un `Event` (ou dans le résumé post-événement),
   - l’utilisateur peut sélectionner la paire utilisée :
     - Ex. “Pour ce run : Pegasus 40 route”.
   - La distance de l’`EventRoute` (ou de l’activité réelle si dispo) est ajoutée à `trackedKilometers`.

> Le système doit rester tolérant : si aucune chaussure n’est choisie, l’événement n’est tout simplement pas pris en compte dans les stats de cette paire.

#### 2.11.5. Intégration avec les campagnes & RunGraph

- **Campagnes ciblées (cf. §7.4.1)** :
  - Triggers sur `trackedKilometers` / `targetKilometers` :
    - ex. “gear.trackedKilometers >= 500 km”.
  - Segmentations possibles :
    - par type (route vs trail),
    - par volume de pratique (nombre d’events par mois).

- **RunGraph (cf. §8.3.3)** :
  - À partir des `Gear` marqués comme “retired” :
    - calcul du **km médian avant remplacement** par type / modèle,
    - distribution des km par segment (0–400 / 400–800 / >800 km),
    - corrélations avec les types de parcours (route/trail) et zones géographiques.

> La brique “Gear” n’a pas besoin d’être ultra profonde pour le MVP,  
> mais sa structure doit anticiper ces usages data pour éviter une refonte lourde plus tard.

---

## 3. Rôles & Permissions

### 3.1. Principe général

Les rôles sont **portés par utilisateur *par événement*** (et pas seulement au niveau global).

Un même utilisateur peut être :
- Organisateur d’une sortie A,
- Encadrant sur une sortie B,
- Simple participant sur une sortie C.

### 3.2. Rôles d’événement

#### 3.2.1. Organisateur

- **Définition** : personne qui crée la sortie. C’est le “capitaine” de l’événement.
- **Unicité** : 
  - MVP : 1 organisateur principal par événement.
  - (Évolution possible : co-organisateurs).
- **Droits** :
  - Créer / éditer / annuler une sortie.
  - Créer / éditer les parcours associés.
  - Créer / éditer les groupes d’allure.
  - Inviter des participants :
    - via invitation interne,
    - via QR code d’événement,
    - via code d’événement (cf. §5).
  - Promouvoir un participant au rôle d’encadrant.
  - Voir la liste complète des participants et leurs groupes d’allure.
  - Clôturer l’événement (fin de sortie).

#### 3.2.2. Encadrant

- **Définition** : personne qui encadre un groupe ou l’événement (coach, kiné, runner expérimenté).
- **Affectation** :
  - L’organisateur peut désigner un ou plusieurs encadrants.
  - (Option MVP+ : un participant peut se proposer comme encadrant, à valider par l’organisateur).
- **Droits** :
  - Être mis en avant sur la page de l’événement (section “Encadrants”).
  - Associer son rôle à un groupe d’allure (ex : “Encadrant groupe 10–11 km/h”).
  - Poster des messages “pédago” / consignes visibles par tous (échauffement, tips, rappel matériel).
  - Consulter la liste des participants (au moins pour son groupe d’allure ; à décider : tous ou restreint).
- **Limites** :
  - Ne peut pas supprimer l’événement.
  - Ne peut pas changer l’organisateur.
  - Ne peut pas modifier des paramètres critiques (date, lieu) — MVP : réservé à l’organisateur.

#### 3.2.3. Participant

- **Définition** : toute personne inscrite à la sortie sans rôle particulier.
- **Droits** :
  - Voir les informations de l’événement (détails, parcours, groupes).
  - Choisir un groupe d’allure (ou aucun si option “je verrai sur place”).
  - Changer son statut de participation (Je viens / Je ne viens plus).
  - Recevoir les rappels de sortie.
- **Limites** :
  - Ne peut pas éditer l’événement.
  - Ne peut pas gérer les autres participants.

---

### 3.3. Rôles globaux (hors MVP strict)

> (À garder en tête pour la suite, mais non bloquant pour le MVP)

- **Compte “Pro” / “Structure”** (magasin, kiné, club) :
  - Pourra créer plusieurs événements, voir des stats globales, gérer une “team” d’organisateurs/encadrants.
- **Compte “Organisateur régulier”** :
  - Badges ou statut mis en avant si l’utilisateur a créé beaucoup de sorties.

---

### 3.4. Modèle de données (vue conceptuelle simplifiée)

- `User`
  - id
  - nom, email, etc.

- `Event`
  - id
  - organiserId → `User`
  - …

- `EventParticipant`
  - id
  - eventId → `Event`
  - userId → `User` (ou null si participant anonyme dans une V1 simplifiée)
  - roleInEvent: `ORGANISER` | `ENCADRANT` | `PARTICIPANT`
  - status: `INVITED` | `GOING` | `MAYBE` | `DECLINED`
  - eventGroupId (optionnel, groupe d’allure)

> **Note** : l’organisateur est à la fois :
> - référence dans `Event.organiserId`  
> - et une ligne `EventParticipant` avec `roleInEvent = ORGANISER`.

---

### 3.5. Comportements clés liés aux rôles

1. **Création d’une sortie**
   - L’utilisateur qui crée l’événement devient automatiquement :
     - `organiserId` de l’Event,
     - `EventParticipant` avec `roleInEvent = ORGANISER` et `status = GOING`.

2. **Promotion d’un encadrant**
   - L’organisateur sélectionne un participant et le promeut en `ENCADRANT`.
   - L’UI reflète ce rôle (badge “Encadrant” sur la page).

3. **Affichage côté participant**
   - En haut de la page d’événement :
     - Photo / nom de l’organisateur
     - Liste courte des encadrants avec leur rôle (ex : “Encadrant groupe 10–11 km/h”).

4. **Clôture d’un événement**
   - Seul l’organisateur (ou un encadrant si on l’autorise plus tard) peut marquer la sortie comme “terminée”.
   - Cela figera l’état (participants, groupes, parcours) et alimentera :
     - l’historique des sorties,
     - la bibliothèque de parcours.

---

## 4. Structure d’un Événement

### 4.1. Principe général

Un **Événement** représente un rendez-vous running (date, heure, lieu, organisateur, thème).

Un événement peut contenir :

- **Cas simple** : 1 seul parcours (ex : “Sortie EF 8 km”).
- **Cas multi-parcours** : plusieurs parcours qui partent en même temps, par exemple :
  - 5 km
  - 7 km
  - 10 km

Les participants s’inscrivent à **l’événement**, puis choisissent **le parcours** qu’ils feront, et éventuellement **un groupe d’allure** à l’intérieur de ce parcours.

---

### 4.2. Entités conceptuelles

Nous introduisons une couche intermédiaire :

- `Event` : le rendez-vous global (le “run and drink du jeudi”).
- `EventRoute` : un parcours proposé dans cet événement (5 km, 7 km, 10 km).
- `EventGroup` : un groupe d’allure optionnel, rattaché à un `EventRoute`.

#### 4.2.1. Event

- Exemples :
  - “Run du jeudi soir – Run & Drink”
  - “Sortie Trail du dimanche – Montée au château”
- Contient :
  - Titre
  - Date & heure de départ
  - Lieu de rendez-vous
  - Description globale
  - Organisateur principal
  - Liste de `EventRoute`

#### 4.2.2. EventRoute (Parcours de l’événement)

- Exemple :
  - Parcours A : “Boucle 5 km – Débutants”
  - Parcours B : “Boucle 7 km – Intermédiaires”
  - Parcours C : “Boucle 10 km – Confirmés”
- Contient :
  - Nom / label (5 km, 7 km, 10 km…)
  - Distance cible (et distance réelle calculée si possible)
  - Tracé (polyligne / GPX)
  - Centre géographique / zone
  - Tags éventuels : route / trail / plat / vallonné…
  - Liste de `EventGroup` (facultatif)

#### 4.2.3. EventGroup (Groupe d’allure)

- Rattaché à un `EventRoute`.
- Exemples :
  - Sur le 10 km :
    - Groupe 1 : 10 km/h
    - Groupe 2 : 12 km/h
- Contient :
  - Label (ex : “10–11 km/h”)
  - Allure cible (optionnellement structurée)
  - Référence à un encadrant (optionnelle)

---

### 4.3. Participants et choix

L’entité `EventParticipant` évolue pour prendre en compte le choix du parcours et du groupe :

- `EventParticipant`
  - eventId → `Event`
  - userId → `User` (ou données anonymes V1)
  - roleInEvent: `ORGANISER` | `ENCADRANT` | `PARTICIPANT`
  - status: `INVITED` | `GOING` | `MAYBE` | `DECLINED`
  - **eventRouteId (optionnel)** → parcours choisi (5 / 7 / 10 km)
  - **eventGroupId (optionnel)** → groupe d’allure choisi dans ce parcours

> Règle métier :
> - Un participant qui clique “Je participe” doit pouvoir :
>   - soit choisir immédiatement son parcours,
>   - soit être “non assigné” (il choisira sur place / plus tard).

---

### 4.4. UX côté organisateur

#### Création d’un événement multi-parcours

1. L’organisateur crée un **Événement** :
   - Titre, date, heure, lieu, description.
2. Il ajoute un ou plusieurs **Parcours** (`EventRoute`) :
   - Exemple :
     - Parcours 1 : “5 km – Découverte”
     - Parcours 2 : “7 km – Intermédiaire”
     - Parcours 3 : “10 km – Confirmé”
   - Pour chaque parcours, il définit / importe le tracé.
3. Optionnellement, pour chaque parcours, il ajoute des **Groupes d’allure** :
   - Ex : sur le 10 km, 10 km/h et 12 km/h.
4. Il publie l’événement, qui devient accessible via :
   - invitations internes,
   - QR code d’événement,
   - code d’événement (cf. §5).

#### Vue organisateur

- Dashboard de l’événement :
  - Récap global :
    - Nombre total de participants.
    - Répartition par parcours (5/7/10 km).
  - Pour chaque parcours :
    - Nombre de participants
    - Répartition par groupe d’allure
    - Encadrants associés.

---

### 4.5. UX côté participant

#### Page d’événement

- Bloc “Infos générales” :
  - Titre, date, heure, lieu, description, organisateur + encadrants.
- Bloc “Parcours disponibles” :
  - Liste des `EventRoute` :
    - Nom + distance + type (route/trail) + mini carte.
- CTA principal :
  - **“Je participe”**
    - Étape 1 : choix du parcours (5 / 7 / 10 km…)
    - Étape 2 : choix du groupe d’allure (si disponible pour ce parcours)
    - Étape 3 : confirmation (prise de contact / email).

> Possibilité MVP : laisser un parcours “non choisi” au moment du RSVP, mais inciter l’utilisateur à choisir.

---

### 4.6. Impact sur la bibliothèque de parcours

- Chaque `EventRoute` validé (avec tracé) alimente la **bibliothèque de parcours**.
- La bibliothèque est donc une collection de **parcours indépendants** des événements :
  - Un même parcours peut être utilisé dans plusieurs événements différents.
- Lors de la création d’un nouvel événement :
  - L’organisateur peut :
    - Créer un nouveau parcours,
    - ou **sélectionner un parcours existant** dans la bibliothèque,
    - ou dupliquer un parcours existant pour l’ajuster.

---

### 4.7. Résumé des cas d’usage clés (avec multi-parcours)

1. **Événement simple** :
   - L’organisateur crée un event avec 1 seul parcours de 8 km.
   - Techniquement : `Event` avec 1 `EventRoute`.

2. **Événement multi-parcours** :
   - L’organisateur crée un event avec 3 `EventRoute` (5, 7, 10 km).
   - Les participants choisissent leur combinaison :
     - EventRoute = 5/7/10 km
     - EventGroup = groupe d’allure (optionnel).

3. **Réutilisation de parcours** :
   - L’organisateur recrée un événement la semaine suivante.
   - Il choisit dans la bibliothèque le parcours “Boucle 7 km EF”.
   - L’app pré-remplit `EventRoute` avec ce tracé.


### 4.8. Tracé théorique vs traces réelles (préparation RunGraph)

Pour RunGraph, il est important de distinguer :

- le **tracé théorique** décidé par l’organisateur (le “plan”),
- des **indices de tracé réel** (ce que font vraiment les participants).

#### 4.8.1. Tracé théorique (MVP)

- Chaque `EventRoute` contient :
  - une polyligne “théorique” (dessin organisateur ou import GPX),
  - distance et D+ calculés sur cette base.
- C’est ce tracé qui :
  - est affiché dans la fiche d’événement,
  - sert de base pour le calcul de distance (matériel / chaussures, etc.).

#### 4.8.2. Traces réelles (évolutif RunGraph)

- Dans une V1+/RunGraph, The Run pourra :
  - soit :
    - récupérer, avec consentement, des **traces GPS réelles** (depuis Strava / device),
  - soit :
    - enregistrer uniquement des **points clés / points de passage** (checkpoints).

- Utilisations possibles :
  - détecter les différences récurrentes entre plan et réalité (routes barrées, passages évités),
  - affiner les **heatmaps**,
  - ajuster automatiquement certains parcours suggérés.

> Le MVP se contente du tracé théorique,  
> mais la conception des entités `EventRoute` et (plus tard) des traces réelles  
> doit anticiper cette distinction pour que RunGraph puisse monter en puissance.

---

## 5. Invitation & Accès à un Événement (sans lien)

### 5.1. Principes

- **Pas de lien à partager** exposé à l’utilisateur.
- Un événement est accessible uniquement via :
  1. **Invitation interne** (utilisateurs déjà présents dans The Run),
  2. **QR code d’événement**,
  3. **Code d’événement** (court et mémorisable).

- Tout utilisateur peut organiser un événement et inviter d’autres personnes.
- Les utilisateurs invités peuvent déjà exister dans la base (cas majoritaire) ou être nouveaux.

---

### 5.2. Invitation interne (personnes déjà dans la DB)

#### Côté organisateur

Depuis la fiche d’un `Event`, section **“Inviter des personnes”** :

- Champ de recherche :
  - Recherche par nom, pseudo ou email parmi les `User` existants.
- Suggestions intelligentes (MVP+ possible) :
  - Utilisateurs déjà présents sur les événements précédents de cet organisateur.
  - Utilisateurs avec lesquels il a déjà partagé au moins un événement.

Actions possibles sur chaque utilisateur trouvé :

- Inviter en tant que :
  - **Participant** (`roleInEvent = PARTICIPANT`),
  - ou **Encadrant** (`roleInEvent = ENCADRANT`).

#### Côté invité (utilisateur existant)

- Reçoit une notification in-app (et / ou un email) indiquant :
  - Le nom de l’organisateur,
  - Le nom de l’événement,
  - La date et l’heure.
- L’événement apparaît dans un onglet **“Invitations”**.
- Flow d’acceptation :
  1. L’utilisateur ouvre l’invitation.
  2. Il voit les détails de l’événement et les éventuels `EventRoute` (5/7/10 km).
  3. Il clique sur **“Je viens”**.
  4. Il choisit :
     - un **parcours** (`eventRouteId`),
     - un **groupe d’allure** (`eventGroupId`, optionnel).
  5. Le système met à jour / crée un `EventParticipant` avec :
     - `status = GOING`,
     - les références de parcours / groupe.

---

### 5.3. QR code d’événement

Chaque `Event` possède un **QR code unique**, généré côté application.

#### Côté organisateur

- Sur la fiche de l’événement :
  - Bouton **“Mode accueil / QR”**.
- Ce mode affiche en plein écran :
  - Le nom de l’événement,
  - L’heure de départ,
  - Le QR code de l’événement.

Usages typiques :

- Afficher le QR sur son propre téléphone au point de rendez-vous.
- Afficher le QR sur une tablette ou un écran.
- Envoyer une capture d’écran du QR dans un groupe existant (WhatsApp, etc.) – les personnes scannent le QR, pas un lien.

#### Côté participant

1. Le participant scanne le QR avec son smartphone.
2. Il est redirigé vers l’écran “Rejoindre cet événement” dans The Run (ou vers le store pour installer l’app, avec pré-sélection de l’événement après installation).

- **Si l’utilisateur est déjà connecté / connu** :
  - L’app le reconnaît.
  - L’écran affiche :
    - Rappel de l’événement,
    - Liste des parcours (5/7/10 km),
    - Groupes d’allure éventuels.
  - Il sélectionne :
    - un parcours,
    - un groupe (optionnel),
  - Puis confirme : **“Je viens”** → création / mise à jour du `EventParticipant`.

- **Si l’utilisateur n’a pas encore de compte** :
  - Flow minimal :
    - Saisie d’un **nom** (obligatoire),
    - Optionnellement email,
    - Choix parcours + groupe.
  - Le système crée :
    - soit un utilisateur “minimal”,
    - soit un “profil à compléter” (décision technique ultérieure),
    - ainsi qu’un `EventParticipant`.

Le QR code remplit **deux fonctions** :
- inscription à l’événement avant le départ,
- **check-in sur place** (présent ce jour-là, sur tel parcours).

---

### 5.4. Code court d’événement

Chaque `Event` est associé à un **code court** lisible et prononçable, par exemple :

- `RUN510`, `SUNTRAIL`, `EF08KM`, etc.

#### Côté organisateur / encadrant / participant

- Le code d’événement est visible sur la fiche de l’événement.
- Il peut être communiqué oralement ou écrit (message, affiche, etc.), sans afficher de lien.

#### Côté participant

- Dans l’application, un onglet / écran **“Rejoindre un événement”** permet :
  - de saisir un **code d’événement**.
- Une fois le code validé :
  - L’app affiche la fiche de l’événement correspondant.
  - L’utilisateur suit ensuite le même flow que pour le QR :
    - “Je viens” → choix parcours → choix groupe → confirmation.

---

### 5.5. Qui peut inviter ?

- **Organisateur** :
  - Accès complet :
    - invitation interne (recherche dans la DB),
    - affichage du QR d’événement,
    - consultation du code d’événement.

- **Encadrant** :
  - Peut consulter le **code d’événement**.
  - Peut afficher le **QR d’événement** (option à arbitrer, mais recommandé pour faciliter l’accueil).
  - Ne peut pas modifier les paramètres structurants de l’événement (date, lieu, etc.).

- **Participant** :
  - Peut consulter le **code d’événement**.
  - Peut, selon configuration, afficher le **QR d’événement** pour le montrer à d’autres (option activable/désactivable côté produit selon choix de contrôle).

> But produit : permettre à **tout utilisateur** de relayer l’accès à un événement
> via QR ou code, sans jamais exposer directement d’URL copiée/collée.

---

### 5.6. Résumé des scénarios d’accès

1. **Utilisateur déjà dans la DB, invité en interne** :
   - Reçoit une invitation in-app,
   - Accepte, choisit parcours + groupe.

2. **Utilisateur sur place** :
   - Scanne le QR affiché par l’organisateur / encadrant,
   - Rejoint l’événement, choisit éventuellement parcours + groupe, et est marqué présent.

3. **Utilisateur qui rejoint via un code** :
   - Ouvre l’app The Run,
   - Va dans “Rejoindre un événement”,
   - Saisit le code court de l’événement,
   - Rejoint l’événement avec le même flow que pour le QR.


### 5.7. Onboarding & “Pressure Test” (Mode invité + Web First)

Scénario critique : un participant scanne le QR **3 minutes avant le départ**, sous la pluie, devant le magasin.

#### 5.7.1. Objectif

Permettre de :

- **rejoindre un événement**,
- être **marqué présent** (check-in),
- **choisir éventuellement un parcours / groupe**,

en **moins de 30 secondes**, même sans compte complet, et sans forcer immédiatement le téléchargement de l’app.

#### 5.7.2. Principe “Web first, app plus tard”

Pour éviter la friction du store au moment critique, le QR code pointe vers une **URL universelle** :

- Ex. : `https://the.run/join/EVENT_CODE`.

Comportement :

1. **Scan (T = 0 s)**  
   L’utilisateur scanne le QR code affiché par l’organisateur.

2. **Redirection intelligente (T + 2 s)**  
   - Si l’app The Run est installée : ouverture via **deep link** sur la fiche de l’événement.
   - Si l’app n’est pas installée : ouverture d’une **Web App légère (PWA)** dans le navigateur mobile :
     - écran très épuré,
     - ressources minimales (chargement rapide).

3. **Saisie minimaliste (T + ~10 s)**  
   Écran type :

   - Titre : “Bienvenue sur [Nom de l’Event]”.
   - Champs :
     - **Prénom** (obligatoire),
     - Nom (initiale ou facultatif),
     - Email (optionnel, recommandé pour recevoir parcours/photos).
   - Bouton principal : **“Je rejoins le run”**.

4. **Choix parcours & groupe (T + ~20 s)**  
   - L’utilisateur est enregistré comme `EventParticipant` avec `status = GOING`.
   - L’écran affiche :
     - la liste des parcours (5/7/10 km),
     - les groupes d’allure (si configurés).
   - Il peut :
     - choisir un parcours + groupe,
     - ou sélectionner “Je verrai sur place” (non assigné).

5. **Écran de succès (T + ~25–30 s)**  
   - Message type :
     > “C’est tout bon, tu es enregistré sur [Nom de l’Event].  
     > Parcours : 7 km – Groupe : 10–11 km/h.”
   - Mention discrète :
     - “Tu pourras compléter ton profil plus tard dans l’app.”

6. **Conversion post-event**  
   - Sur cet écran de succès (et/ou par email, si fourni) :
     - CTA :  
       > “Télécharge The Run pour retrouver les infos de tes prochaines sorties, ton historique et synchroniser avec Strava.”

#### 5.7.3. Gestion technique du compte “invité”

Lorsqu’un utilisateur passe par ce flow Web/PWA sans compte existant :

- Le backend crée :
  - un `User` “minimal” avec un flag `isGuest = true`,
  - un `EventParticipant` associé avec :
    - `status = GOING`,
    - `roleInEvent = PARTICIPANT`,
    - et éventuellement un `eventRouteId` / `eventGroupId` si choisis.

- Si l’utilisateur **installe ensuite l’app** et crée un compte complet avec le **même email** :
  - un mécanisme de **fusion** de compte rapproche le compte “guest” et le nouveau compte,
  - l’historique (events passés, parcours, matériel) est conservé.

> Objectif : ne jamais bloquer l’entrée sur l’event à cause d’un compte incomplet,  
> tout en maximisant la conversion en compte complet après coup.

#### 5.7.4. Optimisations mobiles (MVP+)

En complément du “Web first” :

- **iOS – App Clip** :
  - Permet d’ouvrir une version ultra légère de The Run après scan du QR,
  - accès direct à la fiche d’événement + bouton “Je participe”,
  - sans installation complète de l’app.

- **Android – Instant Apps / Intent Filters** :
  - Comportement similaire : chargement d’un module léger pour afficher l’event,
  - expérience plus fluide que la PWA sur certains devices.

Ces optimisations sont **MVP+** : le MVP doit déjà être utilisable sur 100 % des smartphones


---

## 6. Modèle d’Offre : Free vs Premium

### 6.1. Principes

- Cœur de cible payante : **les organisateurs réguliers** (plusieurs events par semaine).
- Les **participants** restent toujours gratuits.
- La différenciation majeure se fait autour :
  - du **volume d’événements**,
  - de l’**accès à la bibliothèque de parcours**,
  - de quelques outils d’automatisation pour organisateurs intensifs,
  - de l’**usage de la data** (Free = contribue, Premium = plus de contrôle et d’exploitation).

---

### 6.2. The Run Free

**Cible :** organisateur occasionnel, petit crew, usage perso.

- **Événements**
  - Jusqu’à **1 événement actif par semaine** (créé ou co-organisé).
  - Création d’événements simples ou multi-parcours (5/7/10 km, etc.).
  - QR code d’événement + code court d’événement.
  - Invitations internes (utilisateurs déjà dans la DB) + inscriptions via QR / code.
  - Gestion des rôles : Organisateur / Encadrant / Participant.
  - Visualisation de la liste des participants, choix parcours + groupe.

- **Parcours**
  - Création, édition et réutilisation de **ses propres parcours**.
  - Accès à la section **“Mes parcours”** uniquement.
  - Accès en lecture aux parcours des événements auxquels l’utilisateur a participé.
  - Pas d’accès à la bibliothèque globale des autres utilisateurs.

- **Data**
  - Les événements et parcours **alimentent la base de données agrégée** (bibliothèque globale + statistiques anonymes d’usage).
  - L’utilisateur Free bénéficie indirectement de ces données (recommandations basiques sur ses propres parcours), sans accès aux données de la communauté.

---

### 6.3. The Run Premium

**Cible :** organisateur régulier, crew actif, club, coach.

- **Événements**
  - **Nombre d’événements actifs illimité.**
  - Même socle fonctionnel que Free (multi-parcours, QR, codes, rôles, gestion participants).
  - Fonctions avancées (MVP+ / V1) :
    - Événements récurrents (ex : “Run du mardi 19h” recréé automatiquement chaque semaine).
    - Pré-configuration de groupes d’allure et d’encadrants récurrents.
    - Possibilité d’avoir plusieurs organisateurs/co-hosts sur un même “crew”.

- **Parcours**
  - Accès à la **bibliothèque complète de parcours publics** issus de la communauté :
    - Recherche par distance, zone géographique, type (route/trail), etc.
    - Suggestions de parcours pour une nouvelle sortie (ex : “Boucles 7–9 km autour de toi”).
  - Création de collections / favoris (ex : “Mes boucles du mardi”).
  - (Évolutif) Rotation intelligente des parcours sur les événements récurrents.

- **Data & contrôle**
  - Les événements Premium participent également à la base agrégée The Run (heatmaps, stats anonymes).
  - Capacités supplémentaires (évolutif) :
    - possibilité de marquer certains parcours comme **“privés”** (non visibles dans la bibliothèque globale),
    - options plus fines de visibilité et de partage.

---

### 6.4. Règles générales

- Un utilisateur peut passer de Free à Premium à tout moment :
  - levée immédiate de la limite de 1 event / semaine,
  - accès immédiat à la bibliothèque globale de parcours.
- La version Free doit rester **suffisante** pour organiser des sorties proprement,
  mais la version Premium doit devenir **évidente** dès que l’utilisateur :
  - organise plusieurs events par semaine,
  - a besoin d’inspiration / variété via les parcours des autres,
  - co-anime un crew structuré.

---

## 7. Monétisation

### 7.1. Objectifs

- Générer du revenu de manière cohérente avec l’usage de The Run, sans dégrader l’expérience.
- S’appuyer sur les données d’usage (parcours, événements, matériel, contexte météo) pour proposer :
  - des **abonnements Premium** aux organisateurs réguliers,
  - des **campagnes ciblées in-app** (pubs utiles, contextuelles),
  - (évolutif) des **Insights agrégés** pour des acteurs B2B (RunGraph).

> Principe clé : The Run **diffuse** des campagnes ciblées,  
> mais **ne vend pas les identités des utilisateurs**.

---

### 7.2. Abonnement Premium (rappel)

- **The Run Free** :
  - 1 événement actif / semaine.
  - Accès uniquement aux parcours créés par l’utilisateur (et ceux des événements auxquels il a participé).
  - Contribution aux données agrégées (parcours, usage, etc.).

- **The Run Premium** :
  - Événements illimités.
  - Accès à la bibliothèque globale de parcours publics.
  - Fonctions avancées pour organisateurs intensifs (événements récurrents, rotation de parcours, multi-organisateurs…).
  - Plus de contrôle sur la visibilité de certains parcours (privé / public – évolutif).

L’abonnement Premium constitue un premier pilier de monétisation orienté **B2C/B2B light**.

---

### 7.3. Campagnes ciblées in-app

The Run propose un second pilier de monétisation via des **campagnes ciblées affichées dans l’app**, à des moments précis, pour des segments pertinents.

#### 7.3.1. Principe général

- Des **annonceurs** (magasins, marques, coachs, etc.) créent des campagnes définies par :
  - une zone géographique,
  - des critères de cible (ex : km chaussures, type de pratique, météo, horaire, type d’event),
  - un budget (impressions, clics, période).
- The Run décide **dans l’app** à quels utilisateurs montrer ces campagnes, en fonction :
  - de leurs données d’usage,
  - du contexte (événement, météo, etc.),
  - de leurs préférences (opt-in pub ciblée).

Les annonceurs ne reçoivent **jamais** la liste nominative des utilisateurs ciblés.  
Ils reçoivent uniquement des métriques agrégées : impressions, clics, conversions estimées.

#### 7.3.2. Acquisition des campagnes (phases)

- **Phase 1 – Affiliation** :
  - Intégration avec des programmes d’affiliation existants (sites e-commerce, marques…).
  - The Run affiche des offres affiliées (codes promo, liens trackés) lorsque les critères sont remplis.
  - Rémunération : commission sur les ventes générées.

- **Phase 2 – Partenariats directs** :
  - Négociation manuelle avec des magasins locaux, coachs, kinés, marques.
  - Création de campagnes spécifiques :
    - ex : “Magasin Running X à Marseille, rayon de 20 km, cible : coureurs route avec chaussures > 500 km.”
  - Rémunération : forfait (par mois) et/ou au volume (impressions/clics).

- **Phase 3 – Régie / réseau (évolutif)** :
  - Si l’audience devient significative, intégration éventuelle à une régie ou à un réseau de campagnes plus structuré.
  - Reste à définir à plus long terme.

---

### 7.4. Scénarios de ciblage (exemples, dont météo)

Le moteur de campagnes s’appuie sur des **triggers** (déclencheurs) composables.

#### 7.4.1. Exemple “Chaussures usées”

- Condition :
  - `gear.type = SHOE` (chaussures),
  - `gear.kilometers >= 500` (seuil configurable),
  - utilisateur dans une zone compatible avec la campagne.
- Placement :
  - écran “Matériel / Chaussures”,
  - ou récap d’activité / d’événement.
- Message type :
  > “Tes chaussures ont déjà 600 km.  
  > Pense à les remplacer – Offre spéciale chez [Annonceur Y].”

#### 7.4.2. Exemple “Météo froide sur un event trail”

- Contexte :
  - Un événement trail est prévu dimanche matin à 8h30.
  - L’app interroge la météo (API tierce) pour le lieu et l’horaire de l’événement.
  - Prévision : **−3 °C**.

- Condition de campagne :
  - type d’événement : `TRAIL` (ou `OUTDOOR`),
  - heure de départ dans les 48–72h,
  - température prévue < 0 °C,
  - utilisateur inscrit à cet event (ou fréquent participant dans la zone),
  - campagne active d’un annonceur équipementier.

- Placement :
  - écran de détail de l’événement,
  - écran de rappel avant l’event,
  - éventuellement notification push contextuelle (si opt-in).

- Message type :
  > “Dimanche, il va faire très froid (−3 °C) pour ton trail.  
  > Pense à t’équiper en textile thermique.  
  > [Annonceur Z] : -15 % sur les vêtements de running hiver cette semaine.”

Ce scénario illustre le **ciblage contextuel intelligent** basé sur la météo et l’inscription à un event.

#### 7.4.3. Autres exemples (évolutifs)

- Gros D+ prévu → mise en avant de bâtons / sacs / gels.
- Event nocturne (heure de départ + coucher du soleil) → frontales & éléments réfléchissants.
- Volume de pratique élevé → abonnement à une préparation structurée, séance de kiné, etc.

---

### 7.5. Positionnement et UX

- Les campagnes sont **intégrées dans des emplacements précis**, en priorité là où :
  - l’utilisateur réfléchit à son matériel (écran chaussures),
  - l’utilisateur prépare un événement (écran d’event, récap météo),
  - l’utilisateur consulte des conseils (échauffement, checklist).

- Les publicités ne doivent pas :
  - bloquer les actions principales (organiser / rejoindre un event),
  - envahir l’interface (pas de pop-up forcé répétitif).

---

### 7.6. Données et conformité

- Les campagnes ciblées utilisent :
  - des données d’usage (parcours, events, matériel, km par paire),
  - des données de contexte (zone, météo, horaire),
  - de manière agrégée dans les rapports annonceurs.

- **Aucune donnée nominative** (nom, email, etc.) n’est vendue ou partagée avec les annonceurs.
- L’utilisateur Free accepte, lors de l’onboarding :
  - que ses données d’usage puissent servir à :
    - des recommandations produits,
    - des campagnes contextuelles,
    - des statistiques agrégées.
- L’utilisateur doit disposer d’options :
  - opt-in / opt-out pour la publicité ciblée,
  - documentation claire sur l’usage de ses données.

La monétisation via campagnes se fait donc sur la **capacité de The Run à cibler et diffuser des messages pertinents**, pas sur la revente brute de la base utilisateurs.

---

## 8. Produit Data – (Nom de code : *RunGraph*)

### 8.1. Objectif du produit data

Créer un produit B2B séparé de l’app grand public, qui transforme les données d’usage de la plateforme en :

- **Cartes de pratique** du running outdoor (où, quand, combien).
- **Analyses agrégées** sur les parcours, les distances, les horaires, les terrains.
- **Insights matériel** (durée de vie réelle des chaussures, types de surfaces, etc.).

Ce produit data est monétisable auprès de :

- Collectivités / offices de tourisme / gestionnaires de parcs.
- Marques et distributeurs de sport.
- Organisateurs d’événements, stations/outdoor, domaines, etc.

> Principe : on vend de l’**information agrégée sur la pratique**, pas des données personnelles.

---

### 8.2. Clients cibles & usages

#### 8.2.1. Collectivités / villes / offices de tourisme

**Problèmes adressés :**
- Où les gens courent-ils vraiment ?
- Quels parcs / berges / chemins sont les plus utilisés ?
- À quelles heures l’usage est-il le plus fort ?
- Où investir (éclairage, sécurité, signalétique, fontaines, etc.) ?

**Exemples d’usage :**
- Heatmap des parcours par quartier / zone.
- Volume de pratique par créneaux horaires (matin, midi, soir, nuit).
- Répartition route / trail / mixte autour de la ville.
- Identification des “zones blanches” (zones peu utilisées mais intéressantes).

#### 8.2.2. Marques / distributeurs / enseignes sport

**Problèmes adressés :**
- Où sont les hotspots de coureurs actifs ?
- Quelles distances typiques sont courues par région / profil ?
- Quelle est la durée de vie réelle des chaussures (km avant remplacement) ?
- Quelle part de trail vs route selon les zones ?

**Exemples d’usage :**
- Études “usage réel” chaussures :
  - km médian avant remplacement par catégorie.
  - surfaces/pratiques associées (route/trail/mixte).
- Cartographie “route vs trail” (par région / pays).
- Aide à la décision marketing (où lancer des opérations, quels types de produits pousser).

#### 8.2.3. Organisateurs d’événements / stations / domaines

**Problèmes adressés :**
- Quels parcours sont naturellement plébiscités ?
- Quels jours / créneaux sont les plus porteurs ?
- Y a-t-il un potentiel pour de nouveaux formats (distances, D+, etc.) ?

**Exemples d’usage :**
- Identifier les “traces naturelles” pour y coller des events / marches / offres.
- Ajuster les parcours officiels aux usages réels.
- Planifier mieux les horaires de départ.

---

### 8.3. Types d’insights produits

Les insights sont construits à partir de données de :

- **Parcours** (Routes / EventRoutes),
- **Événements** (Event + participation),
- **Matériel** (gear, en particulier chaussures),
- **Contexte** (zone géographique, créneau horaire, météo).

#### 8.3.1. Insights “Parcours & zones”

- Heatmaps d’usage (par secteur, ville, région).
- Distribution des distances :
  - ex. : “Dans ce secteur, 60 % des parcours font 5–9 km.”
- Profil des parcours :
  - route vs trail vs mixte,
  - D+ moyen,
  - durée moyenne d’utilisation.
- Parcours “phares” :
  - ceux qui sont utilisés fréquemment par de nombreux runners.

#### 8.3.2. Insights “Temporalité & météo”

- Volume de pratique par :
  - jour de la semaine,
  - créneaux horaires (matin / midi / soir / nuit).
- Comparaison saisonnière :
  - ex. : usage hiver vs été sur un même parc / massif.
- Corrélation pratique / météo (évolutif) :
  - impact des températures extrêmes, pluie, neige.

#### 8.3.3. Insights “Matériel / chaussures”

Sous réserve que la brique “gear” soit en place.

- **Km médian avant remplacement** d’une paire de chaussure, par catégorie (route/trail).
- Distribution d’usage :
  - % des paires remplacées avant 400 km, entre 400–800 km, >800 km.
- Surfaces et distances typiques associées à une catégorie / modèle.
- Évolution potentielle dans le temps (changements de comportement, adoption de nouveaux modèles).

---

### 8.4. Données utilisées & niveau d’agrégation

#### 8.4.1. Données sources (niveau applicatif)

- `Route / EventRoute` :
  - géométrie (polyligne),
  - distance, D+ approximatif,
  - zone géographique (bbox / centre + rayon),
  - type (route / trail / mixte),
  - éventuels tags (urbain / nature / bord de mer, etc.).

- `Event` :
  - date / heure de départ,
  - type (sortie route, sortie trail, autre),
  - nombre de participants (inscrits vs présents/check-in).

- `Gear` (chaussures) :
  - type (route / trail),
  - km cumulés,
  - date de début / fin d’usage,
  - catégorie / modèle (si déclaré).

**Important :**  
À ce niveau, les données sont **liées aux utilisateurs**, mais ne sont **jamais** exposées telles quelles à l’extérieur.

#### 8.4.2. Données agrégées (niveau Insights)

RunGraph ne manipule que des **agrégats anonymisés**, par exemple :

- Par zone :
  - nb de parcours uniques,
  - nb d’utilisations,
  - distribution de distances,
  - % route vs trail,
  - volume par créneau horaire.

- Par catégorie de chaussure :
  - km médian avant arrêt d’usage,
  - distribution de km,
  - surfaces associées.

Aucune donnée nominative (nom, email, identifiant user) n’est incluse dans les exports / dashboards B2B.

---

### 8.5. Formats de livraison

Plusieurs formats possibles (évolutifs) pour les clients B2B :

1. **Dashboard SaaS** (Web) :
   - accès avec compte client,
   - filtres par zone, période, type de pratique,
   - visualisation carto + graphs.

2. **Rapports périodiques** :
   - rapports PDF trimestriels / annuels,
   - focus par région / type de pratique / catégorie matériel.

3. **Exports / API** (évolutif) :
   - endpoints pour récupérer des agrégats (pas du brut),
   - ex. : `GET /insights/zones/{zoneId}/usage`, `GET /insights/shoes/category/{id}`.

---

### 8.6. Lien avec l’app grand public & Free vs Premium

- Les utilisateurs **Free** :
  - profitent d’une app gratuite,
  - leurs événements, parcours et usage matériel alimentent la base d’insights (anonymisée),
  - servent à améliorer :
    - les recommandations de parcours,
    - les déclencheurs de campagnes contextuelles,
    - la qualité des statistiques globales.

- Les utilisateurs **Premium** :
  - ont un meilleur accès à la valeur produite par ces données :
    - bibliothèque globale de parcours,
    - suggestions enrichies,
    - automatisation (événements récurrents, rotation de parcours).
  - peuvent bénéficier à terme d’options de contrôle plus fines :
    - rendre certains parcours “privés” (non visibles dans la bibliothèque publique),
    - exclure certains événements sensibles de l’agrégat Insights (selon cont
