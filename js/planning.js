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

  // Same rule as CarpWater/scripts/capp_sankey_supply_layout.py well_production_af:
  // dry tables (supply≈demand) restore GW ribbon = table GW + recycled;
  // normal availability table keeps GW ribbon = table GW (CAPP not added into trunk TOTAL).
  const MEET_DEMAND_EPS_AF = 50;

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
    diagramTotal: document.getElementById("hud-diagram-total"),
    uwmpSupply: document.getElementById("hud-uwmp-supply"),
    demand: document.getElementById("hud-demand"),
    balance: document.getElementById("hud-balance"),
    cite: document.getElementById("hud-cite"),
    note: document.getElementById("hud-note"),
  };

  /** @type {Map<string, object>} */
  const byId = new Map();
  let selectedId = "normal_wy";
  let imgToken = 0;

  const fmt = (n) =>
    n == null || Number.isNaN(n) ? "—" : `${Math.round(n).toLocaleString("en-US")} AFY`;

  const fmtBalance = (n) => {
    if (n == null || Number.isNaN(n)) return "—";
    const sign = n > 0 ? "+" : "";
    return `${sign}${Math.round(n).toLocaleString("en-US")} AFY`;
  };

  function diagramGroundwaterAf(row) {
    const gw = Number(row.groundwater_af) || 0;
    const recycled = Number(row.recycled_af) || 0;
    const demand = row.demand_af;
    const supply = row.supply_af;
    const meetsDemand =
      demand != null &&
      supply != null &&
      Math.abs(Number(supply) - Number(demand)) <= MEET_DEMAND_EPS_AF;
    return meetsDemand ? gw + recycled : gw;
  }

  function diagramTotalAf(row) {
    return (
      diagramGroundwaterAf(row) +
      (Number(row.cachuma_af) || 0) +
      (Number(row.swp_af) || 0)
    );
  }

  function updateButtons() {
    buttons.forEach((btn) => {
      const on = btn.dataset.scenario === selectedId;
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function updateHud(row) {
    if (!row) {
      [
        hud.gw,
        hud.cachuma,
        hud.swp,
        hud.recycled,
        hud.diagramTotal,
        hud.uwmpSupply,
        hud.demand,
        hud.balance,
      ].forEach((el) => {
        el.textContent = "—";
      });
      hud.note.textContent = "";
      return;
    }

    const gwDiagram = diagramGroundwaterAf(row);
    const totalDiagram = diagramTotalAf(row);
    const gwTable = Number(row.groundwater_af) || 0;

    hud.gw.textContent = fmt(gwDiagram);
    hud.cachuma.textContent = fmt(row.cachuma_af);
    hud.swp.textContent = fmt(row.swp_af);
    hud.recycled.textContent = fmt(row.recycled_af);
    hud.diagramTotal.textContent = fmt(totalDiagram);
    hud.uwmpSupply.textContent = fmt(row.supply_af);
    hud.demand.textContent = fmt(row.demand_af);
    hud.balance.textContent = fmtBalance(row.balance_af);
    hud.cite.textContent =
      `Scenario: ${row.label} · Planning year ${row.planning_year} · UWMP Table ${row.table} · Projected · Provisional exhibit`;

    // Keep scenario footnotes short — the HUD accounting-note covers dual-total logic.
    const notes = [];
    if (Math.round(gwDiagram) !== Math.round(gwTable)) {
      notes.push(
        `Table ${row.table} groundwater residual: ${fmt(gwTable)} (after recycled).`
      );
    }
    if (Math.round(totalDiagram) !== Math.round(Number(row.supply_af) || 0)) {
      notes.push(
        `UWMP supply total (${fmt(row.supply_af)}) includes CAPP; diagram total is the trunk ribbons only.`
      );
    }
    if (
      Math.round(
        (Number(row.groundwater_af) || 0) +
          (Number(row.cachuma_af) || 0) +
          (Number(row.swp_af) || 0) +
          (Number(row.recycled_af) || 0)
      ) !== Math.round(Number(row.supply_af) || 0)
    ) {
      notes.push(
        `UWMP printed supply total differs by 1 AF from the source-column sum; exhibit cites the table total.`
      );
    }
    hud.note.textContent = notes.join(" ");
  }

  function showScenarioImage(id) {
    const token = ++imgToken;
    const file = PNG_BY_ID[id] || "scenario-normal.png";
    const path = `../assets/planning/${file}`;
    placeholderPath.textContent = `assets/planning/${file}`;

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
    img.alt = `Planning supply Sankey — ${byId.get(id)?.label || id}`;
    img.src = `${path}?s=${encodeURIComponent(id)}&v=5`;
  }

  function setSelectedScenario(id) {
    if (!byId.has(id) && byId.size) return;
    selectedId = id;
    updateButtons();
    defEl.textContent = DEFINITIONS[id] || "";
    updateHud(byId.get(id));
    showScenarioImage(id);
  }

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => setSelectedScenario(btn.dataset.scenario));
  });

  defEl.textContent = DEFINITIONS.normal_wy;
  showScenarioImage("normal_wy");

  fetch("../data/supply_planning_scenarios.json?v=5")
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
      updateButtons();
    });
})();
