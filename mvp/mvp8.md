# [EPIC] MVP-8 – Free/Premium (structure, sans billing)

## Description

Mettre en place **l’ossature fonctionnelle** du modèle Free / Premium décrite dans le CdC, sans intégrer encore la partie facturation (Stripe & co).

Concrètement, cet EPIC couvre :

- La **représentation de l’offre** sur le `User` (plan Free/Premium).
- La **gestion des limites** côté Free (1 event actif / semaine, accès restreint aux parcours).
- Les **avantages Premium** au niveau de l’accès à la bibliothèque de parcours et des events illimités.
- Une UI minimale pour que l’utilisateur sache s’il est Free ou Premium, et ce que ça change.
- Un mécanisme simple pour **switcher un compte** en Premium (admin / feature flag) le temps que le billing soit branché plus tard.

## Objectifs

- Poser une base claire : chaque utilisateur sait s’il est Free ou Premium.
- Faire respecter, techniquement, les principaux garde-fous définis dans le CdC :
  - Free : 1 event actif / semaine, accès limité à la bibliothèque.
  - Premium : events illimités, accès à la bibliothèque globale.
- Permettre de tester le modèle d’offre en conditions réelles (produit & data) **avant** d’ajouter la couche de paiement.

---

# S8.1.1 – Modèle d’offre sur le User (plan Free/Premium)

## User Story

En tant que **équipe produit/tech**,  
quand je gère les droits d’un utilisateur,  
je veux savoir s’il est Free ou Premium dans le modèle de données,  
afin d’appliquer les bonnes règles de limites et d’accès.

## Critères d’acceptation

- [ ] Le modèle `User` possède des champs permettant de représenter l’offre, par exemple :
  - [ ] `plan` = `FREE` | `PREMIUM` (enum ou string),
  - [ ] `planSince` (date de début du plan),
  - [ ] `planUntil` (optionnel, pour expiration / tests).
- [ ] Par défaut, tout nouvel utilisateur est créé en plan `FREE`.
- [ ] Il existe au moins un mécanisme interne pour changer le plan d’un utilisateur :
  - [ ] via un endpoint admin (MVP),
  - [ ] ou une commande interne (seed / script).
- [ ] Le backend expose le plan dans les réponses “profil” :
  - [ ] ex. `GET /me` retourne le champ `plan`.

## Notes techniques

- Prévoir l’extensibilité (`PRO`, `TEAM`, etc.) en gardant `plan` suffisamment générique (enum extensible).
- Pour l’instant, on ne gère pas la facturation ni les périodes d’essai : `planSince` et `planUntil` serviront surtout au debug et à des tests manuels.
- Endpoint admin possible : `PATCH /admin/users/{id}/plan`.

---

**Phase**: MVP  
**Level**: Story  
**Area**: Backend, Data model

---

# S8.1.2 – Exposer le plan et les avantages dans l’app

## User Story

En tant qu’**utilisateur**,  
quand j’utilise The Run,  
je veux savoir si je suis en Free ou en Premium et ce que cela implique,  
afin de comprendre pourquoi certaines fonctionnalités sont limitées ou non.

## Critères d’acceptation

- [ ] L’écran “Profil” (ou “Compte”) affiche :
  - [ ] le plan courant (`Free` ou `Premium`),
  - [ ] une liste synthétique des avantages liés au plan.
- [ ] Pour un utilisateur Free :
  - [ ] un message indique clairement :
    - “Tu es sur The Run Free”,
    - limite d’1 événement actif / semaine,
    - accès limité à la bibliothèque de parcours.
  - [ ] un CTA “Voir les avantages Premium” est présent (même si le billing n’est pas branché).
- [ ] Pour un utilisateur Premium :
  - [ ] un message indique :
    - “Tu es sur The Run Premium”,
    - événements actifs illimités,
    - accès à la bibliothèque globale de parcours.
- [ ] En cas de passage manuel de Free → Premium (via l’admin), l’UI reflète le changement sans bug (aucun cache bloquant).

## Notes techniques

- Réutilise le champ `plan` exposé par `GET /me`.
- Les descriptions / avantages peuvent être des constantes côté front pour le MVP (pas besoin de les rendre dynamiques tout de suite).
- Le CTA “Voir les avantages Premium” pourra, dans une V1, ouvrir un écran de pricing et, plus tard, déclencher un flux de paiement.

---

**Phase**: MVP  
**Level**: Story  
**Area**: Web/Mobile UI, Backend (profil)

---

# S8.2.1 – Appliquer la limite Free : 1 événement actif par semaine

## User Story

En tant qu’**organisateur Free**,  
quand j’essaie de créer ou publier une nouvelle sortie,  
je veux que l’app m’empêche proprement de dépasser 1 événement actif par semaine,  
afin de respecter les limites de The Run Free et de comprendre l’intérêt du Premium.

## Critères d’acceptation

- [ ] Pour un `User` dont `plan = FREE` :
  - [ ] la création ou publication d’un nouvel `Event` (status `PLANNED`) vérifie le nombre d’événements actifs déjà associés à cet utilisateur sur la **semaine en cours**.
- [ ] La règle est, en MVP :
  - [ ] “Un utilisateur Free ne peut avoir plus de **1 événement actif par semaine**”,
  - [ ] un événement actif = `status = PLANNED` avec `startDateTime` dans la semaine courante (ex. lundi–dimanche, timezone config).
- [ ] Si la limite est atteinte :
  - [ ] l’API refuse la création / publication du nouvel event,
  - [ ] un message d’erreur explicite est retourné (“Limite The Run Free atteinte : 1 événement actif par semaine. Passe en Premium pour en créer plus.”).
- [ ] Pour un `User` dont `plan = PREMIUM` :
  - [ ] aucune limite d’événements actifs n’est appliquée.

## Notes techniques

- La “semaine” peut être définie en MVP comme ISO week (lundi → dimanche) ou glissante 7 jours ; il faut juste être cohérent partout.
- Endpoint concerné : `POST /events` et éventuellement `PATCH /events/{id}` lorsqu’un brouillon deviendrait `PLANNED` (si concept de brouillon).
- On compte uniquement les événements dont l’utilisateur est `organiserId` (pas ceux où il est participant ou encadrant).

---

**Phase**: MVP  
**Level**: Story  
**Area**: Backend (rules), Web/Mobile UI (affichage des erreurs)

---

# S8.2.2 – Restreindre l’accès à la bibliothèque de parcours pour les utilisateurs Free

## User Story

En tant qu’**organisateur Free**,  
quand je crée une sortie et que je choisis un parcours,  
je ne veux voir que mes propres parcours et ceux de mes events,  
afin que la bibliothèque globale reste un avantage Premium.

## Critères d’acceptation

- [ ] Lors d’un appel à la recherche de `Route` (bibliothèque) :
  - [ ] si `plan = FREE` :
    - [ ] l’API ne retourne que :
      - les `Route` créés par cet utilisateur,
      - et/ou les parcours utilisés dans ses événements précédents (selon ce qui est décidé dans le CdC),
    - [ ] aucun parcours d’autres utilisateurs n’est visible.
  - [ ] si `plan = PREMIUM` :
    - [ ] l’API peut retourner l’ensemble des `Route` publics de la zone (bibliothèque globale).
- [ ] L’UI reflète cette différence :
  - [ ] Free : libellé “Mes parcours”,
  - [ ] Premium : libellé “Bibliothèque de parcours” (plus large).
- [ ] Si un utilisateur Free tente d’appeler un endpoint “bibliothèque globale” (via un client malicieux ou bug front) :
  - [ ] le backend applique quand même la restriction (pas de data qui fuit).

## Notes techniques

- Endpoint typique : `GET /routes` avec des filtres.
- Filtrage appliqué côté backend en fonction de `user.plan`.
- Pour le MVP, on peut se contenter d’implémenter “Mes parcours” pour Free et “Tous les parcours publics” pour Premium, sans modes privés.

---

**Phase**: MVP  
**Level**: Story  
**Area**: Backend (autorisations / filtres), Web/Mobile UI

---

# S8.3.1 – Écran “Passer en Premium” (sans paiement)

## User Story

En tant qu’**utilisateur Free curieux**,  
quand je clique sur “Voir les avantages Premium”,  
je veux voir un écran clair qui explique ce que j’y gagne,  
afin de décider si ça vaut le coup pour mon usage.

## Critères d’acceptation

- [ ] Un écran “The Run Premium” est accessible :
  - [ ] depuis le profil (CTA “Voir les avantages Premium”),
  - [ ] et/ou depuis certains écrans bloqués (voir S8.3.2).
- [ ] Cet écran présente :
  - [ ] la comparaison Free vs Premium sur les points clés :
    - nombre d’événements actifs,
    - accès bibliothèque de parcours,
    - outils d’automatisation (récurrence, etc. même si marqué “à venir”),
  - [ ] un texte simple sur la cible : organisateur régulier, club, coach.
- [ ] Le CTA principal est, en MVP :
  - [ ] “Contacte-nous pour tester Premium”,
  - [ ] ou “Demander l’activation Premium” (qui peut, pour l’instant, passer par un simple mail ou un trigger admin).
- [ ] Aucun paiement n’est déclenché automatiquement dans le MVP.

## Notes techniques

- L’écran peut être statique côté front (configuration / constante).
- Plus tard, le CTA pointera vers un vrai flux de billing (Stripe, etc.).
- Un endpoint simple `POST /me/request-premium` peut créer un “ticket” ou envoyer un mail interne.

---

**Phase**: MVP  
**Level**: Story  
**Area**: Web/Mobile UI

---

# S8.3.2 – Upsell contextualisé quand une limite Free est atteinte

## User Story

En tant qu’**utilisateur Free**,  
quand je suis bloqué par une limite de mon plan (ex. 2ᵉ event de la semaine),  
je veux voir immédiatement une explication claire et un chemin vers Premium,  
afin de comprendre quoi faire sans frustration.

## Critères d’acceptation

- [ ] Si un utilisateur Free tente de :
  - [ ] créer un 2ᵉ event actif dans la semaine (cf. S8.2.1),
  - [ ] accéder à la bibliothèque globale de parcours (cf. S8.2.2),
    alors :
  - [ ] l’UI affiche un message explicite décrivant la limite Free,
  - [ ] propose un CTA “Découvrir Premium”.
- [ ] Ce CTA ouvre l’écran “The Run Premium” décrit en S8.3.1.
- [ ] L’utilisateur n’est pas laissé devant une simple erreur technique (ex. toast “403”), le message est **produit** (“Tu as atteint la limite The Run Free…”).
- [ ] Les mêmes endpoints backend renvoient un code d’erreur approprié (`403` ou `422`) avec un message structuré que le front peut interpréter pour afficher l’upsell.

## Notes techniques

- Format d’erreur recommandé :
  - code applicatif (ex. `FREE_PLAN_EVENT_LIMIT_REACHED`),
  - message lisible,
  - éventuellement un champ `upgradeAvailable = true`.
- Le front peut mapper ces codes à des modales spécifiques d’upsell.

---

**Phase**: MVP  
**Level**: Story  
**Area**: Backend (erreurs), Web/Mobile UI (modales / messages)

---

# S8.4.1 – Switch manuel Free ↔ Premium pour tests (Admin / Feature flag)

## User Story

En tant que **équipe produit / test**,  
quand je prépare le lancement et les tests de The Run,  
je veux pouvoir passer un utilisateur de Free à Premium (et inversement) manuellement,  
afin de simuler les deux parcours sans dépendre d’un système de paiement.

## Critères d’acceptation

- [ ] Un mécanisme d’admin permet de changer le `plan` d’un `User` :
  - [ ] via un endpoint restreint (`PATCH /admin/users/{id}/plan`),
  - [ ] ou via une console interne / commande (outil CLI).
- [ ] Le changement de plan est immédiat :
  - [ ] les limites d’event (S8.2.1) et l’accès bibliothèque (S8.2.2) sont impactés dès le prochain appel.
- [ ] Le changement de plan est loggé :
  - [ ] au minimum en logs techniques (qui → quoi → quand),
  - [ ] idéalement via un petit historique de plan (optionnel en MVP).
- [ ] Aucun mécanisme de paiement n’est nécessaire pour utiliser ce switch en environnement de prod test / beta.

## Notes techniques

- Endpoints admin à sécuriser strictement (auth + role admin).
- Possibilité d’ajouter un flag `isTestUser` pour certains comptes de démonstration.
- Ce mécanisme sera réutilisé à terme pour gérer certains cas support ou migration.

---

**Phase**: MVP  
**Level**: Story  
**Area**: Backend (admin), Ops/Test
