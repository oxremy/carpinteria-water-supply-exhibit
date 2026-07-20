(() => {
  const YEAR_MIN = 2011;
  const YEAR_MAX = 2025;
  const DEFAULT_YEAR = 2025;

  const yearButtonsEl = document.getElementById("year-buttons");
  const img = document.getElementById("sankey-img");
  const placeholder = document.getElementById("sankey-placeholder");
  const placeholderYear = document.getElementById("placeholder-year");
  const placeholderFileYear = document.getElementById("placeholder-file-year");

  const hud = {
    gw: document.getElementById("hud-gw"),
    cachuma: document.getElementById("hud-cachuma"),
    swp: document.getElementById("hud-swp"),
    total: document.getElementById("hud-total"),
    demand: document.getElementById("hud-demand"),
    cite: document.getElementById("hud-cite"),
  };

  /** @type {Map<number, object>} */
  const byYear = new Map();
  /** @type {HTMLButtonElement[]} */
  let yearButtons = [];
  let selectedYear = DEFAULT_YEAR;

  const fmt = (n) =>
    n == null || Number.isNaN(n) ? "—" : `${Math.round(n).toLocaleString("en-US")} AF`;

  const pngPath = (year) => `assets/historical/sankey-${year}.png`;

  function buildYearButtons() {
    const frag = document.createDocumentFragment();
    for (let year = YEAR_MIN; year <= YEAR_MAX; year += 1) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "year-btn";
      btn.dataset.year = String(year);
      btn.textContent = String(year);
      btn.setAttribute("aria-pressed", "false");
      btn.addEventListener("click", () => setSelectedYear(year));
      frag.appendChild(btn);
    }
    yearButtonsEl.replaceChildren(frag);
    yearButtons = [...yearButtonsEl.querySelectorAll(".year-btn")];
  }

  function updateYearButtons() {
    yearButtons.forEach((btn) => {
      const on = Number(btn.dataset.year) === selectedYear;
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function updateHud(row) {
    if (!row) {
      hud.gw.textContent = "—";
      hud.cachuma.textContent = "—";
      hud.swp.textContent = "—";
      hud.total.textContent = "—";
      hud.demand.textContent = "—";
      return;
    }
    const total = row.groundwater_af + row.cachuma_af + row.swp_af;
    hud.gw.textContent = fmt(row.groundwater_af);
    hud.cachuma.textContent = fmt(row.cachuma_af);
    hud.swp.textContent = fmt(row.swp_af);
    hud.total.textContent = fmt(total);
    hud.demand.textContent = fmt(row.demand_af);
    hud.cite.textContent =
      `Year ${row.year} · Source: UWMP Figure 4-1 / Table 4-3 · Historical actual · Provisional exhibit`;
  }

  function showPngOrPlaceholder(year) {
    placeholderYear.textContent = String(year);
    placeholderFileYear.textContent = String(year);

    const path = pngPath(year);
    const probe = new Image();
    probe.onload = () => {
      img.src = path;
      img.alt = `Historical water supply Sankey diagram for ${year}`;
      img.hidden = false;
      placeholder.hidden = true;
    };
    probe.onerror = () => {
      img.removeAttribute("src");
      img.hidden = true;
      placeholder.hidden = false;
    };
    probe.src = path;
  }

  function setSelectedYear(year) {
    const y = Math.min(YEAR_MAX, Math.max(YEAR_MIN, Number(year)));
    selectedYear = y;
    updateYearButtons();
    updateHud(byYear.get(y));
    showPngOrPlaceholder(y);
  }

  buildYearButtons();

  fetch("data/supply_historical.json")
    .then((r) => {
      if (!r.ok) throw new Error(`Failed to load historical JSON (${r.status})`);
      return r.json();
    })
    .then((data) => {
      (data.years || []).forEach((row) => byYear.set(row.year, row));
      setSelectedYear(DEFAULT_YEAR);
    })
    .catch((err) => {
      console.error(err);
      hud.cite.textContent = "Could not load supply_historical.json";
      setSelectedYear(DEFAULT_YEAR);
    });
})();
