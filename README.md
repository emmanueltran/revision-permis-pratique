# Révision permis – épreuve pratique

Application web pour réviser les **100 fiches officielles** de l'épreuve pratique du permis B : vérifications intérieures et extérieures du véhicule, questions de sécurité routière (QSER) et questions de premiers secours.

**👉 Essayer l'application : https://emmanueltran.github.io/revision-permis-pratique/**

## Fonctionnalités

- **Simulation d'examen** : une fiche tirée au hasard (ou choisie par son numéro), posée en 3 temps comme le jour de l'examen (vérification, question de sécurité routière, premiers secours), avec un score sur 3.
- **Flashcards avec répétition espacée** : un système de boîtes de Leitner fait revenir les questions ratées jusqu'à 16 fois plus souvent que les questions acquises. Les questions présentes sur plusieurs fiches sont regroupées (100 fiches donnent 167 questions uniques).
- **Recherche** dans toutes les fiches, avec surlignage des résultats.
- **Suivi de progression** par catégorie, enregistré dans le navigateur, sans compte ni serveur.
- Adaptée au mobile, avec un mode sombre automatique.

## Comment c'est construit

```
├── index.html          # structure de la page
├── styles.css          # mise en page responsive et mode sombre
├── app.js              # logique : examen, flashcards, recherche, progression
├── data/fiches.json    # les 100 fiches au format JSON
└── scripts/parse_pdf.py  # extraction des fiches depuis le PDF officiel
```

### Extraction des données

Les fiches sont publiées dans un PDF de 40 pages en deux colonnes (question à gauche, réponse à droite). Le script `scripts/parse_pdf.py` utilise **pdfplumber** pour lire la position de chaque mot sur la page, puis :

1. regroupe les mots en lignes selon leur position verticale ;
2. sépare questions et réponses selon leur position horizontale ;
3. repère le début de chaque fiche (marqueur `VI` ou `VE`) et ses sections (`QSER`, `1ers secours`) ;
4. nettoie le texte (pieds de page, listes à puces, ponctuation) et corrige les quelques fiches où une étiquette du PDF se superpose au texte.

```bash
pip install pdfplumber
python scripts/parse_pdf.py banque-verifications.pdf data/fiches.json
```

### Front-end

HTML, CSS et JavaScript, sans framework ni étape de build. Le site est hébergé gratuitement sur GitHub Pages.

## Lancer en local

```bash
python -m http.server 8000
# puis ouvrir http://localhost:8000
```

(Un serveur local est nécessaire, car le navigateur bloque le chargement de `fiches.json` quand on ouvre `index.html` directement.)

## Source

Banque de questions de l'épreuve pratique publiée par la Délégation à la Sécurité Routière (DSR), version du 1er janvier 2023. Ce projet est un outil de révision personnel, non officiel.
