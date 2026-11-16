// Colour playground — dev server only (base.njk loads it when `dev` is true;
// it is never part of the production build).
//
// A small panel in the corner of the page for trying palettes, link styles
// and single colours on the real site. Choices are remembered in this
// browser; "Copy CSS" gives the current values to paste back into
// css/site.css (or to send to Claude).

const root = document.documentElement;
const STORE = "playground";

const PALETTES = [
  ["", "Five colours (current)"],
  ["pink", "First pink (board 21)"],
];
const LINKS = [
  ["", "Red text (current)"],
  ["wine", "Wine text"],
];
// [custom property, label]
const COLOURS = [
  ["--paper", "Ground"],
  ["--ink", "Type"],
  ["--mid", "Rosa"],
  ["--hot", "Red"],
  ["--hero-bg", "Hero"],
  ["--news-bg", "News block"],
  ["--news-accent", "News heading"],
  ["--pubs-bg", "Publications band"],
  ["--band", "Background band"],
  ["--band-years", "Background years"],
  ["--footer-bg", "Footer"],
  ["--link-color", "Link text"],
];

let state = { palette: "", links: "", colours: {}, open: true, combo: null, order: 0, view: "theme" };
try {
  state = { ...state, ...JSON.parse(localStorage.getItem(STORE) || "{}") };
} catch {}
// ?palette= and ?links= in the address win over what was remembered
const query = new URLSearchParams(location.search);
if (query.has("palette")) state.palette = query.get("palette");
if (query.has("links")) state.links = query.get("links");

const save = () => {
  try {
    localStorage.setItem(STORE, JSON.stringify(state));
  } catch {}
};

// Any CSS colour → #rrggbb, for <input type="color">.
const probe = document.createElement("canvas").getContext("2d");
const toHex = (value) => {
  probe.fillStyle = "#000000";
  probe.fillStyle = value.trim();
  return probe.fillStyle.startsWith("#") ? probe.fillStyle : "#000000";
};

const panel = document.createElement("aside");
panel.setAttribute("aria-label", "Colour playground");
const shadow = panel.attachShadow({ mode: "open" });
shadow.innerHTML = `
<style>
  :host { position: fixed; right: 12px; bottom: 12px; z-index: 9999; font: 13px/1.3 system-ui, sans-serif; color: #111; }
  .box { width: 290px; max-height: calc(100vh - 24px); overflow: auto; background: #fff; border: 1px solid #111; box-shadow: 4px 4px 0 rgb(0 0 0 / .25); }
  header { display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; background: #111; color: #fff; }
  header button { background: none; border: 0; color: inherit; font: inherit; cursor: pointer; padding: 2px 4px; }
  .body { padding: 10px; display: grid; gap: 10px; }
  .body[hidden] { display: none; }
  label { display: grid; gap: 3px; font-weight: 600; }
  select { font: inherit; padding: 3px; }
  .colours { display: grid; gap: 4px; }
  .colour { display: grid; grid-template-columns: 30px 1fr auto; align-items: center; gap: 8px; font-weight: 400; }
  .colour input { width: 30px; height: 22px; padding: 0; border: 1px solid #999; background: none; }
  .colour code { font-size: 11px; color: #555; }
  .colour.changed span { font-weight: 600; }
  .row { display: flex; gap: 6px; }
  .row button { flex: 1; font: inherit; padding: 5px; background: #fff; border: 1px solid #111; cursor: pointer; }
  .row button:hover { background: #eee; }
  p { margin: 0; color: #555; font-size: 11px; }
  .sizes { display: flex; gap: 4px; }
  .sizes button { flex: 1; font: inherit; padding: 3px; background: #fff; border: 1px solid #999; cursor: pointer; }
  .sizes button[aria-pressed="true"] { background: #111; color: #fff; border-color: #111; }
  .combos { display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px; max-height: 190px; overflow: auto; padding: 2px; border: 1px solid #ddd; }
  .combo { display: flex; height: 26px; padding: 0; border: 2px solid transparent; background: none; cursor: pointer; }
  .combo[aria-pressed="true"] { border-color: #111; }
  .combo i { flex: 1; }
  .names { min-height: 2.6em; }
  .picks { display: grid; gap: 6px; }
  .pick { display: grid; grid-template-columns: 74px 1fr; align-items: start; gap: 6px; }
  .pick div { display: flex; flex-wrap: wrap; gap: 2px; }
  .pick button { width: 18px; height: 18px; padding: 0; border: 1px solid rgb(0 0 0 / .25); cursor: pointer; }
  .pick button[aria-pressed="true"] { outline: 2px solid #111; outline-offset: 1px; }
</style>
<div class="box">
  <header><span>Colours</span><button type="button" id="toggle" aria-expanded="true">hide</button></header>
  <div class="body" id="body">
    <label>Palette <select id="palette"></select></label>
    <label>Links <select id="links"></select></label>
    <div><strong>Colour combinations</strong> <span id="count"></span></div>
    <div class="sizes" id="sizes"><button type="button" data-view="theme">Red and rosa</button><button type="button" data-view="2">All 2</button><button type="button" data-view="3">All 3</button><button type="button" data-view="4">All 4</button></div>
    <div class="combos" id="combos"></div>
    <p class="names" id="names">From Sanzo Wada, A Dictionary of Color Combinations. Click a strip to try it.</p>
    <div class="row"><button type="button" id="shuffle">Swap roles</button><button type="button" id="uncombo">Clear combination</button></div>
    <div><strong>Single colours from the book</strong></div>
    <div class="picks" id="picks"></div>
    <div class="colours" id="colours"></div>
    <div class="row"><button type="button" id="reset">Reset colours</button><button type="button" id="copy">Copy CSS</button></div>
    <p>Dev server only. Choices are kept in this browser.</p>
  </div>
</div>`;

const $ = (id) => shadow.getElementById(id);
const fill = (select, options, value) => {
  select.innerHTML = options.map(([v, label]) => `<option value="${v}">${label}</option>`).join("");
  select.value = value;
};
fill($("palette"), PALETTES, state.palette);
fill($("links"), LINKS, state.links);

$("colours").innerHTML = COLOURS.map(
  ([prop, label]) =>
    `<label class="colour" data-prop="${prop}"><input type="color"><span>${label}</span><code></code></label>`
).join("");

// Put the state on the page, then show what each colour resolved to.
function apply() {
  for (const key of ["palette", "links"]) {
    if (state[key]) root.dataset[key] = state[key];
    else delete root.dataset[key];
  }
  root.style.cssText = "";
  for (const [prop, value] of Object.entries(state.colours)) root.style.setProperty(prop, value);

  const computed = getComputedStyle(root);
  for (const row of shadow.querySelectorAll(".colour")) {
    const prop = row.dataset.prop;
    // links have no colour of their own until a link style sets one: they follow the type colour
    const value = computed.getPropertyValue(prop) || computed.getPropertyValue("--page-text");
    const hex = toHex(value);
    row.querySelector("input").value = hex;
    row.querySelector("code").textContent = hex.toUpperCase();
    row.classList.toggle("changed", prop in state.colours);
  }
  save();
}

// ---- Colour combinations ------------------------------------------------
// Data: Sanzo Wada, A Dictionary of Color Combinations, as published at
// github.com/mattdesl/dictionary-of-colour-combinations (MIT licence).
let wada = null;

const luminance = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
// every ordering of 0..n-1, starting with 0..n-1 itself, so "Swap roles" can step through them
const orders = (n) => {
  const all = [];
  const walk = (done, left) => (left.length ? left.forEach((x, i) => walk([...done, x], [...left.slice(0, i), ...left.slice(i + 1)])) : all.push(done));
  walk([], Array.from({ length: n }, (_, i) => i)); // the first one keeps the given order
  return all;
};

// Hue family of a colour, for keeping to the site's red / rosa / wine theme.
const hsl = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  if (!d) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = 60 * (max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4);
  return [h, s, l];
};
const family = (hex) => {
  const [h, s, l] = hsl(hex);
  if (!(h >= 330 || h <= 18) || s < 0.3) return "other";
  return l >= 0.68 ? "rosa" : l < 0.32 ? "wine" : "red";
};
const inTheme = (combo) => combo.slice(1).filter((i) => family(wada.colors[i][1]) !== "other").length >= 2;

// Best first guess at roles: the strongest colour leads (hero), then the
// lightest (accent), then the darkest (News), then what is left (band).
function byRole(indices) {
  const rest = [...indices];
  const take = (score) => {
    if (!rest.length) return [];
    const best = rest.reduce((a, b) => (score(wada.colors[b][1]) > score(wada.colors[a][1]) ? b : a));
    rest.splice(rest.indexOf(best), 1);
    return [best];
  };
  const strength = (hex) => { const [, s, l] = hsl(hex); return s * (1 - Math.abs(l - 0.45)); };
  return [...take(strength), ...take((hex) => hsl(hex)[2]), ...take((hex) => -hsl(hex)[2]), ...rest];
}

// A combination gives 2–4 colours and no roles. They go, in order, to: the
// hero (and everything else that is "red"), the accent ("rosa"), the News
// block, the publications band. Ground and type stay as they are, and each
// text colour on a coloured block is whichever of ground and type reads better.
function useCombination() {
  const combo = wada.combos.find((c) => c[0] === state.combo);
  if (!combo) return;
  const sorted = byRole(combo.slice(1));
  const hexes = sorted.map((i) => wada.colors[i][1]);
  const order = orders(hexes.length);
  const picked = order[state.order % order.length].map((i) => hexes[i]);
  const [main, accent, news, band] = picked;

  for (const prop of ["--hot", "--mid", "--news-bg", "--pubs-bg", "--hero-bg", "--footer-bg", "--ring-half", "--hero-text", "--hero-dots", "--footer-text", "--news-text", "--news-accent", "--pubs-text", "--background-heading", "--band-years"]) delete state.colours[prop];
  root.style.cssText = "";
  for (const key of ["palette", "links"]) state[key] ? (root.dataset[key] = state[key]) : delete root.dataset[key];
  const base = getComputedStyle(root);
  const ground = toHex(base.getPropertyValue("--paper"));
  const type = toHex(base.getPropertyValue("--ink"));
  const tint = toHex(base.getPropertyValue("--band"));
  const on = (bg) => (contrast(ground, bg) >= contrast(type, bg) ? ground : type);
  const newsBg = news || type;
  const bandBg = band || tint;

  Object.assign(state.colours, {
    "--hot": main,
    "--mid": accent,
    "--news-bg": newsBg,
    "--ring-half": newsBg,
    "--pubs-bg": bandBg,
    "--hero-text": on(main),
    "--hero-dots": on(main),
    "--footer-text": on(main),
    "--news-text": on(newsBg),
    "--news-accent": contrast(accent, newsBg) >= 3 ? accent : on(newsBg),
    "--pubs-text": on(bandBg),
    "--background-heading": contrast(main, ground) >= 3 ? main : type,
    "--band-years": contrast(main, tint) >= 4.5 ? main : type,
    "--footer-bg": main,
  });
  // coloured links follow the combination too, if it is readable as text
  state.colours["--link-color"] = contrast(main, ground) >= 4.5 ? main : type;
  $("names").textContent = `No. ${combo[0]}: ` + order[state.order % order.length].map((i) => wada.colors[sorted[i]][0]).join(", ") + " (hero, accent, News, band)";
}

function drawCombinations() {
  const list = wada.combos.filter((c) => (state.view === "theme" ? inTheme(c) : c.length - 1 === +state.view));
  $("count").textContent = `(${list.length})`;
  for (const b of $("sizes").children) b.setAttribute("aria-pressed", String(b.dataset.view === state.view));
  $("combos").innerHTML = list
    .map((c) => `<button type="button" class="combo" data-id="${c[0]}" aria-pressed="${c[0] === state.combo}" title="No. ${c[0]}: ${c.slice(1).map((i) => wada.colors[i][0]).join(", ")}">${c.slice(1).map((i) => `<i style="background:${wada.colors[i][1]}"></i>`).join("")}</button>`)
    .join("");
}

fetch("/js/wada.json")
  .then((r) => r.json())
  .then((data) => {
    wada = data;
    drawCombinations();
    drawPicks();
    if (state.combo) { useCombination(); apply(); }
  })
  .catch(() => ($("names").textContent = "Could not load the combinations."));

// Single colours from the book, by family, each for one part of the theme.
const PICKS = [
  ["red", "Red", ["--hot"]],
  ["rosa", "Rosa", ["--mid"]],
  ["wine", "Wine", ["--news-bg", "--ring-half"]],
];
function drawPicks() {
  $("picks").innerHTML = PICKS.map(([fam, label, props]) => {
    const current = (state.colours[props[0]] || "").toUpperCase();
    const swatches = wada.colors
      .filter(([, hex]) => family(hex) === fam)
      .sort((a, b) => hsl(b[1])[2] - hsl(a[1])[2])
      .map(([name, hex]) => `<button type="button" data-fam="${fam}" data-hex="${hex}" title="${name} ${hex}" aria-label="${name}" aria-pressed="${hex === current}" style="background:${hex}"></button>`)
      .join("");
    return `<div class="pick"><span>${label}</span><div>${swatches}</div></div>`;
  }).join("");
}
$("picks").addEventListener("click", (e) => {
  const hex = e.target.dataset.hex;
  if (!hex) return;
  for (const prop of PICKS.find(([fam]) => fam === e.target.dataset.fam)[2]) state.colours[prop] = hex;
  drawPicks();
  apply();
});

$("sizes").addEventListener("click", (e) => {
  if (!e.target.dataset.view) return;
  state.view = e.target.dataset.view;
  drawCombinations();
  save();
});
$("combos").addEventListener("click", (e) => {
  const button = e.target.closest(".combo");
  if (!button) return;
  state.combo = +button.dataset.id;
  state.order = 0;
  drawCombinations();
  useCombination();
  apply();
});
$("shuffle").addEventListener("click", () => {
  if (!state.combo) return;
  state.order += 1;
  useCombination();
  apply();
});
$("uncombo").addEventListener("click", () => {
  state.combo = null;
  state.colours = {};
  drawCombinations();
  $("names").textContent = "From Sanzo Wada, A Dictionary of Color Combinations. Click a strip to try it.";
  apply();
});

$("palette").addEventListener("change", (e) => {
  state.palette = e.target.value;
  state.colours = {}; // a palette starts from its own colours
  if (state.combo && wada) useCombination(); // keep the combination on the new ground
  apply();
});
$("links").addEventListener("change", (e) => {
  state.links = e.target.value;
  delete state.colours["--link-color"];
  apply();
});
$("colours").addEventListener("input", (e) => {
  const row = e.target.closest(".colour");
  state.colours[row.dataset.prop] = e.target.value.toUpperCase();
  apply();
});
$("reset").addEventListener("click", () => {
  state.colours = {};
  state.combo = null;
  if (wada) drawCombinations();
  apply();
});
$("copy").addEventListener("click", async () => {
  const lines = [
    `/* palette: ${state.palette || "five colours"}, links: ${state.links || "red text"}${state.combo ? `, Wada combination ${state.combo}` : ""} */`,
    ...Object.entries(state.colours).map(([prop, value]) => `${prop}: ${value};`),
  ];
  try {
    await navigator.clipboard.writeText(lines.join("\n"));
    $("copy").textContent = "Copied";
  } catch {
    $("copy").textContent = "Copy failed";
  }
  setTimeout(() => ($("copy").textContent = "Copy CSS"), 1200);
});
$("toggle").addEventListener("click", () => {
  state.open = !state.open;
  $("body").hidden = !state.open;
  $("toggle").textContent = state.open ? "hide" : "show";
  $("toggle").setAttribute("aria-expanded", String(state.open));
  save();
});
$("body").hidden = !state.open;
$("toggle").textContent = state.open ? "hide" : "show";

document.body.append(panel);
apply();
