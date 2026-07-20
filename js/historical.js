(() => {
  const YEAR_MIN = 2011;
  const YEAR_MAX = 2025;
  const DEFAULT_YEAR = 2025;

  const img = document.getElementById("sankey-img");
  const placeholder = document.getElementById("sankey-placeholder");
  const placeholderYear = document.getElementById("placeholder-year");
  const yearButtons = [...document.querySelectorAll(".year-btn[data-year]")];

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
  let selectedYear = DEFAULT_YEAR;
  let imgToken = 0;

  const fmt = (n) =>
    n == null || Number.isNaN(n) ? "—" : `${Math.round(n).toLocaleString("en-US")} AF`;

  const pngPath = (year) => `assets/historical/sankey-${year}.png`;

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

  function showYearImage(year) {
    const token = ++imgToken;
    const path = pngPath(year);
    placeholderYear.textContent = String(year);

    img.onload = () => {
      if (token !== imgToken) return;
      img.hidden = false;
      placeholder.hidden = true;
    };
    img.onerror = () => {
      if (token !== imgToken) return;
      img.hidden = true;
      placeholder.hidden = false;
    };
    img.alt = `Historical water supply Sankey diagram for ${year}`;
    // Cache-bust so a prior failed/cached response cannot stick.
    img.src = `${path}?y=${year}`;
  }

  function setSelectedYear(year) {
    const y = Math.min(YEAR_MAX, Math.max(YEAR_MIN, Number(year)));
    selectedYear = y;
    updateYearButtons();
    updateHud(byYear.get(y));
    showYearImage(y);
  }

  yearButtons.forEach((btn) => {
    btn.addEventListener("click", () => setSelectedYear(btn.dataset.year));
  });

  // Paint controls/image immediately; fill HUD when JSON arrives.
  setSelectedYear(DEFAULT_YEAR);

  fetch(`data/supply_historical.json?v=3`)
    .then((r) => {
      if (!r.ok) throw new Error(`Failed to load historical JSON (${r.status})`);
      return r.json();
    })
    .then((data) => {
      (data.years || []).forEach((row) => byYear.set(row.year, row));
      updateHud(byYear.get(selectedYear));
    })
    .catch((err) => {
      console.error(err);
      hud.cite.textContent = "Could not load supply_historical.json";
    });
})();
