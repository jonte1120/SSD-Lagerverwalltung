const STORAGE_KEY = "lageruebersicht.v1";

const state = loadState();

const els = {
  saveState: document.querySelector("#saveState"),
  tabs: document.querySelectorAll(".tab"),
  views: document.querySelectorAll(".view"),
  materialForm: document.querySelector("#materialForm"),
  transactionForm: document.querySelector("#transactionForm"),
  materialRows: document.querySelector("#materialRows"),
  transactionRows: document.querySelector("#transactionRows"),
  stockRows: document.querySelector("#stockRows"),
  averageRows: document.querySelector("#averageRows"),
  txMaterial: document.querySelector("#txMaterial"),
  txDate: document.querySelector("#txDate"),
  averageMaterial: document.querySelector("#averageMaterial"),
  stockSearch: document.querySelector("#stockSearch"),
  stockStatus: document.querySelector("#stockStatus"),
  exportCsv: document.querySelector("#exportCsv"),
  exportJson: document.querySelector("#exportJson"),
  importJson: document.querySelector("#importJson"),
  resetDemo: document.querySelector("#resetDemo"),
  kpiMaterials: document.querySelector("#kpiMaterials"),
  kpiStock: document.querySelector("#kpiStock"),
  kpiLow: document.querySelector("#kpiLow"),
  kpiValue: document.querySelector("#kpiValue"),
};

els.txDate.valueAsDate = new Date();

els.tabs.forEach((tab) => {
  tab.addEventListener("click", () => setView(tab.dataset.view));
});

els.materialForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const material = {
    id: createId(),
    name: value("#materialName"),
    category: value("#materialCategory"),
    unit: value("#materialUnit"),
    initial: numberValue("#materialInitial"),
    min: numberValue("#materialMin"),
    price: numberValue("#materialPrice"),
  };
  state.materials.push(material);
  event.target.reset();
  persist();
});

els.transactionForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const quantity = numberValue("#txQuantity");
  if (quantity === 0) return;

  state.transactions.unshift({
    id: createId(),
    date: value("#txDate"),
    materialId: value("#txMaterial"),
    type: value("#txType"),
    quantity,
    person: value("#txPerson"),
    note: value("#txNote"),
  });

  event.target.reset();
  els.txDate.valueAsDate = new Date();
  persist();
});

els.stockSearch.addEventListener("input", render);
els.stockStatus.addEventListener("change", render);
els.averageMaterial.addEventListener("change", render);
els.exportCsv.addEventListener("click", exportAverageCsv);
els.exportJson.addEventListener("click", exportJson);
els.importJson.addEventListener("change", importJson);
els.resetDemo.addEventListener("click", () => {
  if (!confirm("Beispieldaten laden und aktuelle Daten ersetzen?")) return;
  const demo = demoState();
  state.materials = demo.materials;
  state.transactions = demo.transactions;
  persist();
});

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;

  const { action, id } = button.dataset;
  if (action === "delete-material") {
    deleteMaterial(id);
  }
  if (action === "delete-transaction") {
    deleteTransaction(id);
  }
});

render();

function setView(name) {
  els.tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.view === name));
  els.views.forEach((view) => view.classList.toggle("active", view.id === `view-${name}`));
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return demoState();

  try {
    const parsed = JSON.parse(raw);
    return {
      materials: Array.isArray(parsed.materials) ? parsed.materials : [],
      transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
    };
  } catch {
    return demoState();
  }
}

function demoState() {
  const materials = [
    {
      id: "mat-schrauben",
      name: "Schrauben M6",
      category: "Befestigung",
      unit: "Stk",
      initial: 500,
      min: 120,
      price: 0.08,
    },
    {
      id: "mat-handschuhe",
      name: "Handschuhe",
      category: "PSA",
      unit: "Paar",
      initial: 80,
      min: 25,
      price: 1.9,
    },
    {
      id: "mat-kabelbinder",
      name: "Kabelbinder",
      category: "Montage",
      unit: "Stk",
      initial: 300,
      min: 75,
      price: 0.04,
    },
  ];

  const today = new Date();
  const date = (daysAgo) => {
    const copy = new Date(today);
    copy.setDate(copy.getDate() - daysAgo);
    return copy.toISOString().slice(0, 10);
  };

  return {
    materials,
    transactions: [
      tx(date(2), "mat-schrauben", "out", 40, "Werkstatt", "Montage"),
      tx(date(4), "mat-handschuhe", "out", 10, "Ausbildung", "Uebung"),
      tx(date(8), "mat-kabelbinder", "out", 55, "Lager", "Verbrauch"),
      tx(date(10), "mat-schrauben", "in", 200, "Einkauf", "Nachlieferung"),
      tx(date(14), "mat-handschuhe", "out", 18, "Werkstatt", "Service"),
      tx(date(21), "mat-schrauben", "out", 65, "Ausbildung", "Training"),
    ],
  };
}

function tx(date, materialId, type, quantity, person, note) {
  return {
    id: createId(),
    date,
    materialId,
    type,
    quantity,
    person,
    note,
  };
}

function createId() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  els.saveState.textContent = `Gespeichert: ${new Date().toLocaleTimeString("de-DE")}`;
  render();
}

function render() {
  renderMaterialOptions();
  renderMaterials();
  renderTransactions();
  renderStock();
  renderAverages();
}

function renderMaterialOptions() {
  const materialOptions = state.materials
    .map((material) => `<option value="${escapeHtml(material.id)}">${escapeHtml(material.name)}</option>`)
    .join("");
  els.txMaterial.innerHTML = materialOptions || '<option value="">Kein Material</option>';

  const averageOptions = [
    '<option value="all">Alle Materialien</option>',
    ...state.materials.map(
      (material) => `<option value="${escapeHtml(material.id)}">${escapeHtml(material.name)}</option>`,
    ),
  ];
  const previous = els.averageMaterial.value;
  els.averageMaterial.innerHTML = averageOptions.join("");
  if ([...els.averageMaterial.options].some((option) => option.value === previous)) {
    els.averageMaterial.value = previous;
  }
}

function renderMaterials() {
  if (!state.materials.length) {
    renderEmpty(els.materialRows, 7);
    return;
  }

  els.materialRows.innerHTML = state.materials
    .map(
      (material) => `
        <tr>
          <td>${escapeHtml(material.name)}</td>
          <td>${escapeHtml(material.category)}</td>
          <td>${escapeHtml(material.unit)}</td>
          <td class="num">${formatNumber(material.initial)}</td>
          <td class="num">${formatNumber(material.min)}</td>
          <td class="num">${formatCurrency(material.price)}</td>
          <td>
            <div class="row-actions">
              <button class="ghost" data-action="delete-material" data-id="${escapeHtml(material.id)}" type="button">Loeschen</button>
            </div>
          </td>
        </tr>
      `,
    )
    .join("");
}

function renderTransactions() {
  if (!state.transactions.length) {
    renderEmpty(els.transactionRows, 7);
    return;
  }

  els.transactionRows.innerHTML = state.transactions
    .map((transaction) => {
      const material = materialById(transaction.materialId);
      return `
        <tr>
          <td>${formatDate(transaction.date)}</td>
          <td>${escapeHtml(material?.name || "Geloeschtes Material")}</td>
          <td>${typeLabel(transaction.type)}</td>
          <td class="num">${formatNumber(transaction.quantity)} ${escapeHtml(material?.unit || "")}</td>
          <td>${escapeHtml(transaction.person)}</td>
          <td>${escapeHtml(transaction.note)}</td>
          <td>
            <div class="row-actions">
              <button class="ghost" data-action="delete-transaction" data-id="${escapeHtml(transaction.id)}" type="button">Loeschen</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

function renderStock() {
  const stock = stockRows();
  const query = els.stockSearch.value.trim().toLowerCase();
  const status = els.stockStatus.value;
  const filtered = stock.filter((row) => {
    const matchesQuery = `${row.name} ${row.category}`.toLowerCase().includes(query);
    const matchesStatus = status === "all" || (status === "low" ? row.isLow : !row.isLow);
    return matchesQuery && matchesStatus;
  });

  if (!filtered.length) {
    renderEmpty(els.stockRows, 11);
  } else {
    els.stockRows.innerHTML = filtered
      .map(
        (row) => `
          <tr>
            <td>${escapeHtml(row.name)}</td>
            <td>${escapeHtml(row.category)}</td>
            <td>${escapeHtml(row.unit)}</td>
            <td class="num">${formatNumber(row.initial)}</td>
            <td class="num">${formatNumber(row.inbound)}</td>
            <td class="num">${formatNumber(row.outbound)}</td>
            <td class="num">${formatNumber(row.adjustment)}</td>
            <td class="num"><strong>${formatNumber(row.current)}</strong></td>
            <td class="num">${formatNumber(row.min)}</td>
            <td><span class="status ${row.isLow ? "low" : "ok"}">${row.isLow ? "Nachbestellen" : "OK"}</span></td>
            <td class="num">${formatCurrency(row.value)}</td>
          </tr>
        `,
      )
      .join("");
  }

  const totalStock = stock.reduce((sum, row) => sum + row.current, 0);
  const totalValue = stock.reduce((sum, row) => sum + row.value, 0);
  els.kpiMaterials.textContent = formatNumber(state.materials.length);
  els.kpiStock.textContent = formatNumber(totalStock);
  els.kpiLow.textContent = formatNumber(stock.filter((row) => row.isLow).length);
  els.kpiValue.textContent = formatCurrency(totalValue);
}

function stockRows() {
  return state.materials.map((material) => {
    const materialTransactions = state.transactions.filter((transaction) => transaction.materialId === material.id);
    const inbound = sum(materialTransactions.filter((transaction) => transaction.type === "in"), "quantity");
    const outbound = sum(materialTransactions.filter((transaction) => transaction.type === "out"), "quantity");
    const adjustment = sum(materialTransactions.filter((transaction) => transaction.type === "adjust"), "quantity");
    const current = material.initial + inbound - outbound + adjustment;

    return {
      ...material,
      inbound,
      outbound,
      adjustment,
      current,
      isLow: current <= material.min,
      value: current * material.price,
    };
  });
}

function renderAverages() {
  const selected = els.averageMaterial.value || "all";
  const rows = weeklyAverageRows().filter((row) => selected === "all" || row.materialId === selected);

  if (!rows.length) {
    renderEmpty(els.averageRows, 6);
    return;
  }

  els.averageRows.innerHTML = rows
    .map(
      (row) => `
        <tr>
          <td>${escapeHtml(row.week)}</td>
          <td>${escapeHtml(row.period)}</td>
          <td>${escapeHtml(row.material)}</td>
          <td class="num">${formatNumber(row.quantity)}</td>
          <td class="num">${formatNumber(row.count)}</td>
          <td class="num">${formatNumber(row.average)}</td>
        </tr>
      `,
    )
    .join("");
}

function weeklyAverageRows() {
  const outgoing = state.transactions.filter((transaction) => transaction.type === "out");
  const groups = new Map();

  outgoing.forEach((transaction) => {
    const material = materialById(transaction.materialId);
    const week = isoWeek(transaction.date);
    const key = `${week.key}|${transaction.materialId}`;
    const existing = groups.get(key) || {
      week: week.label,
      weekSort: week.key,
      period: week.period,
      materialId: transaction.materialId,
      material: material?.name || "Geloeschtes Material",
      quantity: 0,
      count: 0,
    };

    existing.quantity += transaction.quantity;
    existing.count += 1;
    groups.set(key, existing);
  });

  return [...groups.values()]
    .map((row) => ({ ...row, average: row.count ? row.quantity / row.count : 0 }))
    .sort((a, b) => b.weekSort.localeCompare(a.weekSort) || a.material.localeCompare(b.material));
}

function isoWeek(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  const day = date.getDay() || 7;
  date.setDate(date.getDate() + 4 - day);
  const yearStart = new Date(date.getFullYear(), 0, 1);
  const weekNo = Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
  const year = date.getFullYear();

  const monday = new Date(`${dateString}T00:00:00`);
  monday.setDate(monday.getDate() - ((monday.getDay() || 7) - 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return {
    key: `${year}-${String(weekNo).padStart(2, "0")}`,
    label: `KW ${String(weekNo).padStart(2, "0")} / ${year}`,
    period: `${formatDateInput(monday)} - ${formatDateInput(sunday)}`,
  };
}

function deleteMaterial(id) {
  if (!confirm("Material und zugehoerige Buchungen loeschen?")) return;
  state.materials = state.materials.filter((material) => material.id !== id);
  state.transactions = state.transactions.filter((transaction) => transaction.materialId !== id);
  persist();
}

function deleteTransaction(id) {
  state.transactions = state.transactions.filter((transaction) => transaction.id !== id);
  persist();
}

function exportAverageCsv() {
  const rows = weeklyAverageRows();
  const header = ["KW", "Zeitraum", "Material", "Verbrauch", "Buchungen", "Durchschnitt je Buchung"];
  const csv = [header, ...rows.map((row) => [row.week, row.period, row.material, row.quantity, row.count, row.average])]
    .map((row) => row.map(csvCell).join(";"))
    .join("\n");
  download(`wochenverbrauch-${formatDateInput(new Date())}.csv`, csv, "text/csv;charset=utf-8");
}

function exportJson() {
  download(`lageruebersicht-${formatDateInput(new Date())}.json`, JSON.stringify(state, null, 2), "application/json");
}

function importJson(event) {
  const [file] = event.target.files;
  if (!file) return;

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    try {
      const parsed = JSON.parse(reader.result);
      state.materials = Array.isArray(parsed.materials) ? parsed.materials : [];
      state.transactions = Array.isArray(parsed.transactions) ? parsed.transactions : [];
      persist();
    } catch {
      alert("Die JSON-Datei konnte nicht gelesen werden.");
    } finally {
      event.target.value = "";
    }
  });
  reader.readAsText(file);
}

function download(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function materialById(id) {
  return state.materials.find((material) => material.id === id);
}

function renderEmpty(target, colspan) {
  target.innerHTML = `<tr><td colspan="${colspan}" class="empty">Keine Daten vorhanden</td></tr>`;
}

function value(selector) {
  return document.querySelector(selector).value.trim();
}

function numberValue(selector) {
  return Number.parseFloat(value(selector).replace(",", ".")) || 0;
}

function sum(rows, key) {
  return rows.reduce((total, row) => total + (Number(row[key]) || 0), 0);
}

function typeLabel(type) {
  return {
    in: "Eingang",
    out: "Verbrauch",
    adjust: "Korrektur",
  }[type] || type;
}

function formatNumber(value) {
  return new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatCurrency(value) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(value || 0);
}

function formatDate(dateString) {
  return new Intl.DateTimeFormat("de-DE").format(new Date(`${dateString}T00:00:00`));
}

function formatDateInput(date) {
  const value = date instanceof Date ? date : new Date(date);
  return value.toISOString().slice(0, 10);
}

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
