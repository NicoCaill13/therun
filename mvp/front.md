### UX / Front

- [ ] Un écran “Créer un événement” est disponible dans l’app.
- [ ] Le formulaire de création permet de saisir :
  - [ ] un **titre** obligatoire,
  - [ ] une **date de départ** obligatoire,
  - [ ] une **heure de départ** obligatoire,
  - [ ] un **lieu de rendez-vous** (au minimum adresse textuelle, idéalement avec point sur carte),
  - [ ] une **description courte** optionnelle.
- [ ] Les champs obligatoires sont clairement indiqués (ex. astérisque, validation inline).
- [ ] En cas de champ obligatoire manquant ou invalide, un message d’erreur clair est affiché et la création est bloquée.
- [ ] Après création réussie, l’utilisateur est redirigé vers la page de détail de l’événement.


### Tests d’intégration / e2e (backend)

- [ ] `POST /events` avec un user PREMIUM valide :
  - [ ] retourne `201`,
  - [ ] le body contient `id`, `status = PLANNED`, `eventCode`.
- [ ] `POST /events` avec un user FREE ayant déjà 1 event PLANNED dans la semaine :
  - [ ] retourne `403`,
  - [ ] le body contient un message expliquant la limite du plan Free.
- [ ] `POST /events` sans `title` ou sans `startDateTime` :
  - [ ] retourne `400 Bad Request` avec les erreurs de validation.

### Tests UI (plus tard / V1 si tu veux pousser)

- [ ] Validation côté formulaire (titre + date/heure obligatoires).
- [ ] Affichage du message d’erreur API en cas de limite Free atteinte.
- [ ] Redirection vers la page détail après succès.
