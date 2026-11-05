"""Extrait les 100 fiches de la banque officielle de questions de l'épreuve pratique
(vérifications techniques, QSER, premiers secours) vers data/fiches.json.

Usage : python scripts/parse_pdf.py banque-verifications.pdf data/fiches.json
Dépendance : pip install pdfplumber
"""
import json
import re
import sys

import pdfplumber

COL_SPLIT = 315      # x séparant la colonne question (gauche) de la colonne réponse (droite)
NUM_MAX_X = 100      # les numéros de fiche sont dans la marge gauche
FOOTER_TOP = 790     # au-delà : pied de page

# Fiches où une étiquette « Question 1ers secours suivante » se superpose au texte du PDF.
QUESTION_RESPIRE = "Quels comportements adopter en présence d’une victime qui ne répond pas et ne réagit pas, mais respire ?"
REPONSE_RESPIRE = ("- La placer en position stable sur le côté ou position latérale de sécurité.\n"
                   "- Alerter les secours.\n"
                   "- Surveiller la respiration de la victime jusqu'à l'arrivée des secours.")
QUESTION_PLS = "Dans quel cas peut-on positionner une victime en Position Latérale de Sécurité (PLS) ?"
REPONSE_PLS = "Si la victime ne répond pas, ne réagit pas et respire."
CORRECTIONS = {
    11: {"secours": (QUESTION_RESPIRE, REPONSE_RESPIRE)},
    59: {"secours": (QUESTION_RESPIRE, REPONSE_RESPIRE)},
    97: {"secours": (QUESTION_RESPIRE, REPONSE_RESPIRE)},
    18: {"secours": (QUESTION_PLS, REPONSE_PLS)},
    76: {"secours": (QUESTION_PLS, REPONSE_PLS)},
}
# Réponses données par un pictogramme dans le PDF (absentes du texte).
REPONSES_PICTO = {
    "défaillance du système de freinage": "Rouge.",
    "feu de brouillard arrière est allumé": "Orange.",
}


def lines_of(page):
    words = [w for w in page.extract_words() if w["top"] < FOOTER_TOP]
    words.sort(key=lambda w: (round(w["top"] / 4), w["x0"]))
    lines = []
    for w in words:
        if lines and abs(lines[-1][0]["top"] - w["top"]) < 4:
            lines[-1].append(w)
        else:
            lines.append([w])
    return lines


def extract(pdf_path):
    fiches, cur, sec = [], None, None
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            for ln in lines_of(page):
                texts = [w["text"] for w in ln]
                core = [w for w in ln if w["x1"] > NUM_MAX_X]
                if len(core) == 1 and core[0]["text"] in ("VI", "VE") and 280 < core[0]["x0"] < 330:
                    cur = {"type": core[0]["text"], "verif": ([], []), "qser": ([], []), "secours": ([], [])}
                    fiches.append(cur)
                    sec = "verif"
                    continue
                if "Réponse" in texts and "QSER" in texts:
                    sec = "qser"
                    continue
                if "Réponse" in texts and "secours" in texts:
                    sec = "secours"
                    continue
                if cur is None:
                    continue
                left = [w["text"] for w in core if w["x0"] < COL_SPLIT]
                right = [w["text"] for w in core if w["x0"] >= COL_SPLIT]
                if left:
                    cur[sec][0].append(" ".join(left))
                if right:
                    cur[sec][1].append(" ".join(right))
    return fiches


def clean(parts):
    s = " ".join(parts)
    s = re.sub(r"\b1er janvier\b|\b2023\b", " ", s)          # pied de page parasite
    s = re.sub(r"\s+", " ", s).strip()
    s = re.sub(r"\s+([?,.:])", r"\1", s)
    s = s.replace("?", " ?").replace(":", " :").replace("  ", " ")
    s = s.replace("doit- elle", "doit-elle").replace("commande De ", "commande de ")
    s = re.sub(r" ?(?:^| )[–-] ", "\n- ", " " + s).strip()
    s = re.sub(r"(\n- |\s-)$", "", s).strip()
    lines = s.split("\n")
    if len(lines) > 1 and not lines[0].startswith("- ") and not lines[0].endswith(":"):
        lines[0] = "- " + lines[0]
    return "\n".join(lines)


def main(pdf_path, out_path):
    out = []
    for i, f in enumerate(extract(pdf_path), 1):
        fiche = {"id": i, "type": f["type"]}
        for key in ("verif", "qser", "secours"):
            q, a = clean(f[key][0]), clean(f[key][1])
            if key in CORRECTIONS.get(i, {}):
                q, a = CORRECTIONS[i][key]
            if not a:
                a = next((r for k, r in REPONSES_PICTO.items() if k in q), "")
            fiche[key] = {"q": q, "a": a}
        out.append(fiche)
    assert len(out) == 100, f"{len(out)} fiches trouvées au lieu de 100"
    with open(out_path, "w", encoding="utf-8") as fh:
        json.dump(out, fh, ensure_ascii=False, indent=1)
    print(f"{len(out)} fiches écrites dans {out_path}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
