// Révision permis – épreuve pratique
// Données : data/fiches.json (100 fiches extraites de la banque officielle, voir scripts/parse_pdf.py)

const LABELS = {
  VI: "Vérification intérieure",
  VE: "Vérification extérieure",
  qser: "Sécurité routière",
  secours: "Premiers secours",
};
const SHORT = { VI: "Intérieures", VE: "Extérieures", qser: "Sécu. routière", secours: "1ers secours" };
const PRACTICAL = "Geste à réaliser dans le véhicule : montrez ou faites fonctionner l'élément demandé.";
const MAX_BOX = 4; // boîtes de Leitner : 0 = à revoir … 4 = acquis
const STORE_KEY = "revision-permis-v1";

const $ = (sel, root = document) => root.querySelector(sel);
const el = (tag, attrs = {}, ...children) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  for (const c of children.flat()) if (c != null) node.append(c);
  return node;
};

// ---------- Stockage (navigateur uniquement, protégé si indisponible) ----------
const memory = {};
const store = {
  load() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch { return memory; }
  },
  save(data) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); } catch { Object.assign(memory, data); }
  },
};
let progress = store.load(); // { [cardKey]: { box, seen, ok } }

function record(key, knew) {
  const p = progress[key] || { box: 0, seen: 0, ok: 0 };
  p.seen += 1;
  if (knew) { p.ok += 1; p.box = Math.min(MAX_BOX, p.box + 1); } else { p.box = 0; }
  progress[key] = p;
  store.save(progress);
}

// ---------- Données ----------
const normalize = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const keyOf = (cat, q) => `${cat}:${normalize(q)}`;
const catOf = (fiche, part) => (part === "verif" ? fiche.type : part);

let fiches = [];
let cards = []; // questions uniques : { key, cat, q, a, fiches: [ids] }

function buildCards() {
  const byKey = new Map();
  for (const f of fiches) {
    for (const part of ["verif", "qser", "secours"]) {
      const cat = catOf(f, part);
      const { q, a } = f[part];
      const key = keyOf(cat, q);
      if (!byKey.has(key)) byKey.set(key, { key, cat, q, a, fiches: [] });
      byKey.get(key).fiches.push(f.id);
    }
  }
  cards = [...byKey.values()];
}

function answerNode(a) {
  return a
    ? el("div", { class: "answer" }, a)
    : el("div", { class: "answer practical" }, PRACTICAL);
}

// ---------- Onglets ----------
function showView(name) {
  document.querySelectorAll(".tabs button").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.view === name)));
  document.querySelectorAll(".view").forEach((v) => (v.hidden = v.id !== `view-${name}`));
  if (name === "stats") renderStats();
  if (name === "cards" && !$("#card-stage").childElementCount) nextCard();
  try { history.replaceState(null, "", `#${name}`); } catch {}
}
document.querySelectorAll(".tabs button").forEach((b) => b.addEventListener("click", () => showView(b.dataset.view)));

// ---------- Simulation d'examen ----------
function startExam(id) {
  const f = fiches.find((x) => x.id === id);
  if (!f) return;
  const steps = ["verif", "qser", "secours"];
  const results = [];
  const stage = $("#exam-stage");

  const renderStep = (i, revealed = false) => {
    stage.replaceChildren();
    if (i === steps.length) return renderResult();
    const part = steps[i];
    const cat = catOf(f, part);
    const { q, a } = f[part];
    const bar = el("div", { class: "steps" }, steps.map((_, j) =>
      el("span", { class: j < i ? (results[j] ? "done-good" : "done-bad") : j === i ? "current" : "" })));
    const card = el("div", { class: "card" },
      bar,
      el("div", { class: "meta" }, el("span", { class: `tag ${cat}` }, LABELS[cat]), el("span", {}, `Fiche ${f.id} · ${i + 1}/3`)),
      el("p", { class: "question" }, q));
    if (!revealed) {
      card.append(el("div", { class: "actions" },
        el("button", { class: "primary reveal", onclick: () => renderStep(i, true) }, "Voir la réponse")));
    } else {
      const answer = (knew) => { record(keyOf(cat, q), knew); results.push(knew); renderStep(i + 1); };
      card.append(answerNode(a), el("div", { class: "actions" },
        el("button", { class: "bad", onclick: () => answer(false) }, "Pas su"),
        el("button", { class: "good", onclick: () => answer(true) }, "Je savais")));
    }
    stage.append(card);
    card.querySelector(".actions button:last-child")?.focus({ preventScroll: true });
  };

  const renderResult = () => {
    const score = results.filter(Boolean).length;
    const msg = score === 3 ? "Les 3 points, parfait." : score === 2 ? "Presque ! Revois la question ratée." : "À retravailler : revois cette fiche dans l'onglet Fiches.";
    stage.append(el("div", { class: "card result" },
      el("div", { class: "meta" }, el("span", {}, `Fiche ${f.id}`), el("span", {}, "")),
      el("p", { class: "score" }, `${score} / 3`),
      el("p", {}, msg),
      el("div", { class: "actions" },
        el("button", { class: "ghost", onclick: () => startExam(f.id) }, "Refaire cette fiche"),
        el("button", { class: "primary", onclick: () => startExam(randomFicheId()) }, "Fiche suivante"))));
  };

  renderStep(0);
}
const randomFicheId = () => fiches[Math.floor(Math.random() * fiches.length)].id;
$("#exam-random").addEventListener("click", () => startExam(randomFicheId()));
$("#exam-pick").addEventListener("submit", (e) => {
  e.preventDefault();
  const n = Number($("#exam-num").value);
  if (n >= 1 && n <= 100) startExam(n);
});

// ---------- Flashcards (répétition espacée simple) ----------
let cardCat = "all";
let lastKey = null;

function pickCard() {
  const pool = cards.filter((c) => cardCat === "all" || c.cat === cardCat);
  // Poids : les cartes jamais vues ou ratées (boîte 0) sortent 16× plus que les cartes acquises.
  const weights = pool.map((c) => (c.key === lastKey && pool.length > 1 ? 0 : 2 ** (MAX_BOX - (progress[c.key]?.box ?? 0))));
  let r = Math.random() * weights.reduce((s, w) => s + w, 0);
  for (let i = 0; i < pool.length; i++) { r -= weights[i]; if (r <= 0) return pool[i]; }
  return pool[pool.length - 1];
}

function nextCard() {
  const c = pickCard();
  lastKey = c.key;
  const stage = $("#card-stage");
  const box = progress[c.key]?.box ?? 0;
  const card = el("div", { class: "card" },
    el("div", { class: "meta" },
      el("span", { class: `tag ${c.cat}` }, LABELS[c.cat]),
      el("span", {}, `${c.fiches.length > 1 ? "Fiches" : "Fiche"} ${c.fiches.join(", ")} · niveau ${box}/${MAX_BOX}`)),
    el("p", { class: "question" }, c.q));
  const actions = el("div", { class: "actions" },
    el("button", { class: "primary reveal", onclick: () => {
      actions.replaceWith(answerNode(c.a), el("div", { class: "actions" },
        el("button", { class: "bad", onclick: () => { record(c.key, false); nextCard(); } }, "À revoir"),
        el("button", { class: "good", onclick: () => { record(c.key, true); nextCard(); } }, "Je savais")));
    } }, "Voir la réponse"));
  card.append(actions);
  stage.replaceChildren(card);
}

$("#card-filters").addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  cardCat = b.dataset.cat;
  document.querySelectorAll("#card-filters button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
  nextCard();
});

// ---------- Liste et recherche ----------
function highlight(text, term) {
  if (!term) return [text];
  const out = [];
  const nText = text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  let i = 0, j;
  while ((j = nText.indexOf(term, i)) !== -1) {
    out.push(text.slice(i, j), el("mark", {}, text.slice(j, j + term.length)));
    i = j + term.length;
  }
  out.push(text.slice(i));
  return out;
}

function renderList() {
  const term = $("#search").value.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const match = (f) => !term || normalize(JSON.stringify(f)).includes(normalize(term));
  const shown = fiches.filter(match);
  $("#list-count").textContent = `${shown.length} fiche${shown.length > 1 ? "s" : ""}`;
  $("#list").replaceChildren(...shown.map((f) =>
    el("details", { class: "fiche", ...(term ? { open: "" } : {}) },
      el("summary", {}, el("span", { class: "num" }, String(f.id).padStart(2, "0")), el("span", { class: `tag ${f.type}` }, f.type), el("span", {}, highlight(f.verif.q, term))),
      el("div", { class: "body" }, ["verif", "qser", "secours"].map((part) => {
        const cat = catOf(f, part);
        return el("div", { class: "qa" },
          el("span", { class: `tag ${cat}` }, LABELS[cat]),
          el("p", {}, el("strong", {}, highlight(f[part].q, term))),
          el("p", { class: "a" }, highlight(f[part].a || PRACTICAL, term)));
      })))));
}
$("#search").addEventListener("input", renderList);

// ---------- Progrès ----------
function renderStats() {
  const cats = ["VI", "VE", "qser", "secours"];
  const tiles = cats.map((cat) => {
    const list = cards.filter((c) => c.cat === cat);
    const learned = list.filter((c) => (progress[c.key]?.box ?? 0) >= 2).length;
    const pct = Math.round((learned / list.length) * 100);
    return el("div", { class: "stat" },
      el("span", { class: `tag ${cat}` }, SHORT[cat]),
      el("div", { class: "big" }, `${learned}/${list.length}`),
      el("div", { class: "hint" }, "questions maîtrisées"),
      el("div", { class: "bar" }, el("i", { style: `width:${pct}%` })));
  });
  const weak = cards.filter((c) => progress[c.key] && progress[c.key].box === 0).slice(0, 8);
  $("#stats").replaceChildren(...[
    el("p", { class: "hint" }, "Une question compte comme maîtrisée après 2 bonnes réponses d'affilée. La progression est enregistrée dans ce navigateur uniquement."),
    el("div", { class: "stat-grid" }, tiles),
    weak.length
      ? el("div", { class: "card" }, el("strong", {}, "À revoir en priorité"),
          el("ul", {}, weak.map((c) => el("li", {}, `${c.q} `, el("span", { class: "hint" }, `(fiche ${c.fiches[0]})`)))))
      : null].filter(Boolean));
}
$("#reset").addEventListener("click", () => {
  progress = {};
  store.save(progress);
  renderStats();
});

// ---------- Démarrage ----------
fetch("data/fiches.json")
  .then((r) => r.json())
  .then((data) => {
    fiches = data;
    buildCards();
    renderList();
    const view = location.hash.slice(1);
    showView(["exam", "cards", "list", "stats"].includes(view) ? view : "exam");
  })
  .catch(() => {
    $("main").prepend(el("div", { class: "card" }, "Impossible de charger les fiches. Ouvre le site via un serveur (voir le README) plutôt qu'en double-cliquant sur le fichier."));
  });
