# Backlog produit – The Run

> Convention :  
> - **Milestones GitHub** : `MVP`, `V1`, `V2`  
> - **ID** : `MVP-1.1.1` = Phase MVP – Epic 1 – Feature 1 – Story 1


## Phase V1  (Milestone : `V1`)

### Epic V1-1 – Événements récurrents & presets

#### Feature V1-1.1 – Récurrence d’events

- **V1-1.1.1** – Définir une récurrence  
  _En tant qu’organisateur, je peux marquer un event comme récurrent (ex. tous les mardis 19h)._

- **V1-1.1.2** – Générer les occurrences futures  
  _En tant que système, je génère les instances futures de l’event selon la règle de récurrence._


#### Feature V1-1.2 – Presets d’event

- **V1-1.2.1** – Sauver un preset  
  _En tant qu’organisateur régulier, je peux sauvegarder une configuration d’event (parcours, groupes, encadrants)._

- **V1-1.2.2** – Créer un event depuis preset  
  _En tant qu’organisateur, je peux créer un event en un clic à partir d’un preset._


---

### Epic V1-2 – Bibliothèque globale & Premium

#### Feature V1-2.1 – Recherche avancée de parcours (Premium)

- **V1-2.1.1** – Vue bibliothèque globale  
  _En tant qu’utilisateur Premium, j’accède à une vue listant les parcours publics de la communauté._

- **V1-2.1.2** – Filtres avancés  
  _En tant qu’utilisateur Premium, je peux filtrer par distance, zone, type (route/trail) et D+ approximatif._

- **V1-2.1.3** – Ajouter aux favoris  
  _En tant qu’utilisateur Premium, je peux ajouter des parcours à “Mes favoris”._


#### Feature V1-2.2 – Collections & rotation

- **V1-2.2.1** – Créer une collection de parcours  
  _En tant qu’organisateur Premium, je peux regrouper plusieurs parcours dans une collection (ex. “Boucles du mardi”)._

- **V1-2.2.2** – Rotation auto sur event récurrent  
  _En tant que système, je peux proposer automatiquement le prochain parcours d’une collection pour un event récurrent._


---

### Epic V1-3 – Météo intégrée

#### Feature V1-3.1 – Météo sur fiche d’event

- **V1-3.1.1** – Appel API météo  
  _En tant que système, je récupère la météo prévue pour le lieu/date/heure de chaque event._

- **V1-3.1.2** – Affichage météo  
  _En tant que participant, je vois la température et l’icône météo sur la fiche event._

- **V1-3.1.3** – Rafraîchissement régulier  
  _En tant que système, je mets à jour la météo périodiquement en approchant de la date de l’event._


---

### Epic V1-4 – Broadcast avancé & annulation/report

#### Feature V1-4.1 – Typologie des messages

- **V1-4.1.1** – Types de messages  
  _En tant qu’organisateur, je peux catégoriser un message : Info / Changement / Annulation._

- **V1-4.1.2** – Mise en avant des messages critiques  
  _En tant que participant, les messages de type “Changement” ou “Annulation” sont visuellement mis en avant._


#### Feature V1-4.2 – Gestion du statut d’event

- **V1-4.2.1** – Annuler un event  
  _En tant qu’organisateur, je peux annuler un event ; les participants sont immédiatement notifiés._

- **V1-4.2.2** – Reporter un event  
  _En tant qu’organisateur, je peux changer la date/heure d’un event ; les participants reçoivent une notification de report._


---

### Epic V1-5 – Gear simple (chaussures)

#### Feature V1-5.1 – Gestion des chaussures

- **V1-5.1.1** – Ajouter une paire  
  _En tant qu’utilisateur, je peux déclarer une paire de chaussures (nom, type, date de début)._

- **V1-5.1.2** – Marquer une paire comme retirée  
  _En tant qu’utilisateur, je peux indiquer qu’une paire n’est plus utilisée._

- **V1-5.1.3** – Vue “Mes chaussures”  
  _En tant qu’utilisateur, je vois la liste de mes chaussures actives et retirées._


#### Feature V1-5.2 – Km cumulés (via events)

- **V1-5.2.1** – Choisir la paire sur un event  
  _En tant que participant, je peux choisir la paire utilisée pour une sortie._

- **V1-5.2.2** – Mise à jour des km  
  _En tant que système, j’ajoute la distance du parcours aux km de la paire choisie._

- **V1-5.2.3** – Indicateur d’usure simple  
  _En tant qu’utilisateur, je vois un indicateur de type “480/600 km” pour chaque paire._


---

### Epic V1-6 – Sync Strava (Version 1)

#### Feature V1-6.1 – Connexion Strava

- **V1-6.1.1** – Flow OAuth Strava  
  _En tant qu’utilisateur, je peux connecter mon compte Strava à The Run._

- **V1-6.1.2** – Stockage des tokens & scopes  
  _En tant que système, je stocke les tokens et droits nécessaires (activity:read / write)._


#### Feature V1-6.2 – Matching & renommage d’activité

- **V1-6.2.1** – Webhooks Strava  
  _En tant que système, je reçois les webhooks “activité créée” pour les utilisateurs connectés._

- **V1-6.2.2** – Matching temporel avec un event  
  _En tant que système, je détecte si une activité Strava correspond à un event The Run (jour + heure ± 30 min)._

- **V1-6.2.3** – Renommage de l’activité Strava  
  _En tant qu’utilisateur, si l’activité matche un event, son titre devient “The Run – [Nom de l’event]”. _


---

### Epic V1-7 – Free vs Premium renforcé (et billing)

#### Feature V1-7.1 – Limites & avantages Premium

- **V1-7.1.1** – Limites avancées pour FREE  
  _En tant que système, j’applique des limites supplémentaires aux comptes FREE (ex. pas d’accès à la bibliothèque globale, pas d’events récurrents)._

- **V1-7.1.2** – Activation des features Premium  
  _En tant qu’utilisateur Premium, je bénéficie des features : bibliothèque globale, récurrence, collections, etc._


#### Feature V1-7.2 – Billing (optionnel en V1 si tu préfères V2)

- **V1-7.2.1** – Intégration d’un provider de paiement (Stripe, etc.)  
  _En tant qu’utilisateur, je peux souscrire à un plan Premium._

- **V1-7.2.2** – Sync état abonnement → plan  
  _En tant que système, je mets à jour le `plan` (FREE/PREMIUM) en fonction de l’état de l’abonnement (actif, expiré)._



---

## Phase V2  (Milestone : `V2`)

### Epic V2-1 – Campagnes ciblées in-app

#### Feature V2-1.1 – Moteur de campagnes

- **V2-1.1.1** – Modèle Campaign & critères  
  _En tant que système, je stocke des campagnes (zone, critères de cible, période, budget)._

- **V2-1.1.2** – Evaluation de triggers  
  _En tant que système, j’évalue les triggers (ex. chaussures > 500 km, event trail, météo < 0°C)._


#### Feature V2-1.2 – Diffusion & tracking

- **V2-1.2.1** – Emplacements d’affichage  
  _En tant qu’utilisateur, je vois les campagnes dans des emplacements précis (écran matériel, fiche event, rappel)._

- **V2-1.2.2** – Tracking impressions / clics  
  _En tant que système, je journalise les impressions et clics pour chaque campagne._


---

### Epic V2-2 – RunGraph v1 (Dashboard B2B)

#### Feature V2-2.1 – Agrégations de base

- **V2-2.1.1** – Jobs d’agrégation périodiques  
  _En tant que système, je calcule des agrégats (usage par zone, distances, horaires) à intervalles réguliers._

- **V2-2.1.2** – Stockage des stats RunGraph  
  _En tant que système, je stocke ces agrégats dans des tables optimisées pour la consultation B2B._


#### Feature V2-2.2 – Dashboard SaaS client

- **V2-2.2.1** – Authentification client B2B  
  _En tant que client RunGraph, je peux me connecter à un dashboard sécurisé._

- **V2-2.2.2** – Cartes & graphiques  
  _En tant que client, je visualise des heatmaps, courbes et histogrammes sur la pratique du running._

- **V2-2.2.3** – Filtres zone / période / type  
  _En tant que client, je peux filtrer par zone géographique, période et type de pratique (route/trail)._


---

### Epic V2-3 – Traces réelles vs théoriques

#### Feature V2-3.1 – Ingestion des traces réelles

- **V2-3.1.1** – Sauvegarder les polylignes d’activités  
  _En tant que système, je stocke la géométrie (simplifiée) des activités Strava liées à un event._

- **V2-3.1.2** – Lier activité ↔ `EventRoute`  
  _En tant que système, je relie chaque activité à l’EventRoute théorique correspondant (si matching)._


#### Feature V2-3.2 – Analyse des écarts

- **V2-3.2.1** – Détecter les zones déviées  
  _En tant que système, j’identifie les segments systématiquement coupés ou évités._

- **V2-3.2.2** – Suggestions d’ajustement de parcours  
  _En tant que produit, je peux voir quels parcours devraient être modifiés selon l’usage réel._


---

### Epic V2-4 – Gear avancé & insights chaussures

#### Feature V2-4.1 – Usure avancée

- **V2-4.1.1** – Catégorisation 0–400 / 400–800 / >800 km  
  _En tant que système, je classe les paires selon des seuils d’usure._

- **V2-4.1.2** – Alertes d’usure contextuelles  
  _En tant qu’utilisateur, je reçois des alertes “à surveiller” / “à remplacer” sur mes paires._


#### Feature V2-4.2 – Insights agrégés (RunGraph)

- **V2-4.2.1** – Km médian avant retrait  
  _En tant que client B2B, je peux voir le km médian avant retrait par type de chaussure._

- **V2-4.2.2** – Corrélation surface / type de chaussure  
  _En tant que client, je vois les corrélations entre catégories de chaussures et types de parcours (route/trail/mixte)._


---

### Epic V2-5 – App Clips / Instant Apps

#### Feature V2-5.1 – App Clip iOS

- **V2-5.1.1** – App Clip “Join Event”  
  _En tant qu’utilisateur iOS, je peux rejoindre un event via un App Clip sans installer l’app complète._

- **V2-5.1.2** – Deep link interne depuis l’App Clip  
  _En tant que système, l’App Clip ouvre directement la fiche de l’event et permet le RSVP._


#### Feature V2-5.2 – Instant App Android

- **V2-5.2.1** – Module Instant App  
  _En tant qu’utilisateur Android, je peux utiliser un module léger pour rejoindre un event._

- **V2-5.2.2** – Fallback PWA  
  _En tant que système, si l’Instant App n’est pas supportée, je reviens au flux PWA MVP._


---

### Epic V2-6 – RGPD & contrôle avancé

#### Feature V2-6.1 – Consentements fins

- **V2-6.1.1** – Gestion A/B/C  
  _En tant qu’utilisateur, je peux gérer séparément mes consentements : recos perso, stats agrégées, pub ciblée._

- **V2-6.1.2** – Respect des consentements  
  _En tant que système, je n’utilise pas les données d’un user pour un usage si le consentement lié est refusé._


#### Feature V2-6.2 – Contrôle de visibilité & exclusion

- **V2-6.2.1** – Parcours privés (Premium)  
  _En tant qu’utilisateur Premium, je peux marquer certains parcours comme privés (hors bibliothèque publique)._

- **V2-6.2.2** – Exclusion d’events des agrégats RunGraph  
  _En tant qu’utilisateur, je peux exclure certains events de l’agrégation RunGraph (si activé par le produit)._
