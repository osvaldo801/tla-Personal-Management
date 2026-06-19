const headers = ["Nombre", "Clase", "Ministerio", "Departamento", "Estado", "Tipo", "Acciones"];

let started = false;
let timer = 0;

export function initServerInteractionHotfix() {
  if (started || typeof window === "undefined") return;
  started = true;

  const run = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      normalizeServerTable();
      ensureDeleteButtons();
      protectDirectActions();
      translateServersCopy();
    }, 160);
  };

  run();
  document.addEventListener("click", protectClickTargets, true);
  const observer = new MutationObserver(run);
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
}

function normalizeServerTable() {
  document.querySelectorAll<HTMLTableElement>(".desktop-profile-table table").forEach((table) => {
    const headerRow = table.querySelector<HTMLTableRowElement>("thead tr");
    if (headerRow) {
      const current = Array.from(headerRow.children).map((cell) => cell.textContent?.trim() ?? "");
      if (current.length !== headers.length || current.some((label, index) => normalize(label) !== normalize(headers[index]))) {
        headerRow.replaceChildren(...headers.map((label) => {
          const th = document.createElement("th");
          th.textContent = label;
          return th;
        }));
      }
    }

    table.querySelectorAll<HTMLTableRowElement>("tbody tr").forEach((row) => {
      const cells = Array.from(row.children) as HTMLTableCellElement[];
      if (cells.length <= headers.length) return;

      const actionCell = row.querySelector<HTMLElement>(".row-actions")?.closest("td") as HTMLTableCellElement | null;
      const safeActionCell = actionCell ?? cells[cells.length - 1];
      const typeCell = cells[5];
      typeCell.textContent = abbreviateType(typeCell.textContent ?? "");
      row.replaceChildren(cells[0], cells[1], cells[2], cells[3], cells[4], typeCell, safeActionCell);
    });

    table.querySelectorAll<HTMLTableCellElement>("td[colspan]").forEach((cell) => cell.setAttribute("colspan", String(headers.length)));
  });
}

function ensureDeleteButtons() {
  document.querySelectorAll<HTMLButtonElement>(".desktop-profile-table .row-actions .btn-danger").forEach((button) => {
    button.style.display = "inline-flex";
    button.style.pointerEvents = "auto";
    button.title = button.title || "Borrar servidor";
    if (!button.textContent?.trim()) {
      const label = document.createElement("span");
      label.textContent = "Borrar";
      button.append(label);
    }
  });
}

function protectDirectActions() {
  document.querySelectorAll<HTMLElement>(".enhanced-profile-photo, .quick-contact, .quick-contact-actions a, .row-actions button, .row-actions select").forEach((element) => {
    element.style.pointerEvents = "auto";
    element.style.position = "relative";
    element.style.zIndex = "5";
  });
}

function protectClickTargets(event: MouseEvent) {
  const target = event.target instanceof Element ? event.target : null;
  if (!target?.closest(".quick-contact, .quick-contact-actions a, .enhanced-profile-photo, .row-actions button, .row-actions select")) return;
  event.stopPropagation();
}

function translateServersCopy() {
  const activeLanguage = document.querySelector(".language-toggle button.active")?.textContent?.trim().toLowerCase();
  const isEnglish = activeLanguage === "en";
  const pairs = isEnglish
    ? new Map([
        ["SERVIDORES", "SERVERS"],
        ["Servidores", "Servers"],
        ["Nuevo servidor", "New server"],
        ["Lista operativa de servidores y colaboradores.", "Operational list of servers and collaborators."],
        ["Gesti\u00f3n", "Management"],
        ["GESTI\u00d3N", "MANAGEMENT"],
      ])
    : new Map([
        ["SERVERS", "SERVIDORES"],
        ["Servers", "Servidores"],
        ["New server", "Nuevo servidor"],
        ["Operational list of servers and collaborators.", "Lista operativa de servidores y colaboradores."],
        ["Management", "Gesti\u00f3n"],
        ["MANAGEMENT", "GESTI\u00d3N"],
      ]);

  document.querySelectorAll<HTMLElement>(".sidebar, .content").forEach((root) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      const text = node.textContent ?? "";
      const trimmed = text.trim();
      const next = pairs.get(trimmed);
      if (next && next !== trimmed) node.textContent = text.replace(trimmed, next);
      node = walker.nextNode();
    }
  });
}

function abbreviateType(value: string) {
  const normalized = normalize(value);
  if (normalized.startsWith("ministerial")) return "MINIS.";
  if (normalized.startsWith("administrativo")) return "ADMIN.";
  return value.trim().slice(0, 6).toUpperCase();
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase().replace(/\s+/g, " ");
}
