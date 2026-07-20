(() => {
  const PNG_BY_ID = {
    normal_wy: "scenario-normal.png",
    single_dry: "scenario-single-dry.png",
    five_year_avg: "scenario-five-year.png",
  };

  const DEFINITIONS = {
    normal_wy: "Average supply availability (UWMP §5.2.3.1 / Table 5-1).",
    single_dry: "Lowest single-year supply (UWMP §5.2.3.2 / Table 5-2).",
    five_year_avg:
      "Driest five-year sequence, average annual use (UWMP §5.2.3.3 / Table 5-4).",
  };

  const buttons = [...document.querySelectorAll(".scenario-btn[data-scenario]")];
  const defEl = document.getElementById("scenario-def");
  const img = document.getElementById("scenario-img");
  const placeholder = document.getElementById("scenario-placeholder");
  const placeholderPath = document.getElementById("placeholder-path");

  const hud = {
    gw: document.getElementById("hud-gw"),
    cachuma: document.getElementById("hud-cachuma"),
    swp: document.getElementById("hud-swp"),
    recycled: document.getElementById("hud-recycled"),
    supply: document.getElementById("hud-supply"),
    demand: document.getElementById("hud-demand"),
    balance: document.getElementById("hud-balance"),
    cite: document.getElementById("hud-cite"),
  };

  /** @type {Map<string, object>} */
  const byId = new Map();
  let selectedId = "normal_wy";

  const fmt = (n) =>
    n == null || Number.isNaN(n) ? "—" : `${Math.round(n).toLocaleString("en-US")} AFY`;

  const fmtBalance = (n) => {
    if (n == null || Number.isNaN(n)) return "—";
    const sign = n > 0 ? "+" : "";
    return `${sign}${Math.round(n).toLocaleString("en-US")} AFY`;
  };

  function updateButtons() {
    buttons.forEach((btn) => {
      const on = btn.dataset.scenario === selectedId;
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function updateHud(row) {
    if (!row) {
      Object.values(hud).forEach((el) => {
        if (el !== hud.cite) el.textContent = "—";
      });
      return;
    }
    hud.gw.textContent = fmt(row.groundwater_af);
    hud.cachuma.textContent = fmt(row.cachuma_af);
    hud.swp.textContent = fmt(row.swp_af);
    hud.recycled.textContent = fmt(row.recycled_af);
    hud.supply.textContent = fmt(row.supply_af);
    hud.demand.textContent = fmt(row.demand_af);
    hud.balance.textContent = fmtBalance(row.balance_af);
    hud.cite.textContent =
      `Scenario: ${row.label} · Planning year ${row.planning_year} · UWMP Table ${row.table} · Projected · Provisional exhibit`;
  }

  function showPngOrPlaceholder(id) {
    const file = PNG_BY_ID[id] || "scenario-normal.png";
    const path = `../assets/planning/${file}`;
    placeholderPath.textContent = `assets/planning/${file}`;

    const probe = new Image();
    probe.onload = () => {
      img.src = path;
      img.alt = `Planning supply Sankey — ${byId.get(id)?.label || id}`;
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

  function setSelectedScenario(id) {
    if (!byId.has(id) && byId.size) return;
    selectedId = id;
    updateButtons();
    defEl.textContent = DEFINITIONS[id] || "";
    updateHud(byId.get(id));
    showPngOrPlaceholder(id);
  }

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => setSelectedScenario(btn.dataset.scenario));
  });

  fetch("../data/supply_planning_scenarios.json")
    .then((r) => {
      if (!r.ok) throw new Error(`Failed to load planning JSON (${r.status})`);
      return r.json();
    })
    .then((data) => {
      (data.scenarios || []).forEach((row) => byId.set(row.id, row));
      const start = data.default_scenario || "normal_wy";
      setSelectedScenario(byId.has(start) ? start : "normal_wy");
    })
    .catch((err) => {
      console.error(err);
      hud.cite.textContent = "Could not load supply_planning_scenarios.json";
      defEl.textContent = DEFINITIONS.normal_wy;
      updateButtons();
      showPngOrPlaceholder("normal_wy");
    });
})();
