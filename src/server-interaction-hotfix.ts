let started = false;
let timer = 0;

export function initServerInteractionHotfix() {
  if (started || typeof window === "undefined") return;
  started = true;

  const run = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      ensureDeleteButtons();
      protectDirectActions();
      normalizeServerTable();
      translateServersCopy();
    }, 160);
  };

  run();
  document.addEventListener("click", (event) => {
    const target = event.target as HTMLElement | null;
    if (target?.closest(".language-toggle")) {
      window.setTimeout(run, 80);
      window.setTimeout(run, 300);
      window.setTimeout(run, 700);
    }
  });
  const observer = new MutationObserver(run);
  observer.observe(document.body, { childList: true, subtree: true });
}

function ensureDeleteButtons() {
  document.querySelectorAll<HTMLButtonElement>(".desktop-profile-table .row-actions .btn-danger").forEach((button) => {
    button.style.display = "inline-flex";
    button.style.pointerEvents = "auto";
    button.title = button.title || "Borrar servidor";
    button.setAttribute("aria-label", button.getAttribute("aria-label") || "Borrar servidor");
    button.querySelectorAll("span").forEach((label) => label.remove());
  });
}

function protectDirectActions() {
  document.querySelectorAll<HTMLElement>(
    ".enhanced-profile-photo, .quick-contact, .quick-contact-actions a, .row-actions button, .row-actions select",
  ).forEach((element) => {
    element.style.pointerEvents = "auto";
    element.style.position = "relative";
    element.style.zIndex = "20";
  });
}

function normalizeServerTable() {
  const activeLanguage = getActiveLanguage();
  const isEnglish = activeLanguage === "en";
  translateServerTableHeaders(isEnglish);

  document.querySelectorAll<HTMLTableRowElement>(".desktop-profile-table tbody tr").forEach((row) => {
    const cells = Array.from(row.children) as HTMLTableCellElement[];
    if (!cells.length) return;

    const colSpanCell = cells.find((cell) => cell.hasAttribute("colspan"));
    if (colSpanCell) {
      colSpanCell.setAttribute("colspan", "7");
      row.replaceChildren(colSpanCell);
      return;
    }

    const actionCell = cells.find((cell) => Boolean(cell.querySelector(".row-actions"))) ?? cells[cells.length - 1];
    const normalizedCells =
      cells.length >= 10
        ? [cells[0], cells[1], cells[2], cells[3], cells[4], cells[5], actionCell]
        : cells.length >= 7
          ? [cells[0], cells[1], cells[2], cells[3], cells[4], cells[5], actionCell]
          : cells;

    if (normalizedCells.length === 7 && normalizedCells.some((cell, index) => row.children[index] !== cell)) {
      row.replaceChildren(...normalizedCells);
    }

    const typeCell = row.children[5] as HTMLTableCellElement | undefined;
    if (typeCell) typeCell.textContent = abbreviateType(typeCell.textContent ?? "");

    const finalActionCell = row.children[6] as HTMLTableCellElement | undefined;
    if (finalActionCell) finalActionCell.classList.add("server-actions-cell");
  });
}

function translateServersCopy() {
  const activeLanguage = getActiveLanguage();
  const isEnglish = activeLanguage === "en";

  document.querySelectorAll<HTMLElement>(".page-heading h1, .content h1").forEach((heading) => {
    const normalized = normalize(heading.textContent ?? "");
    if (normalized === "servidores" || normalized === "servers") {
      heading.textContent = isEnglish ? "SERVERS" : "SERVIDORES";
    }
  });

  translateServerTableHeaders(isEnglish);

  const pairs = isEnglish
    ? new Map([
        ["Servidores", "Servers"],
        ["SERVIDORES", "SERVERS"],
        ["Nuevo servidor", "New server"],
        ["Lista operativa de servidores y colaboradores.", "Operational list of servers and collaborators."],
        ["Gestión", "Management"],
        ["GESTIÓN", "MANAGEMENT"],
        ["Buscar", "Search"],
        ["Clase", "Class"],
        ["Ministerio", "Ministry"],
        ["Estado", "Status"],
        ["Tipo", "Type"],
        ["Acciones", "Actions"],
        ["Editar", "Edit"],
      ])
    : new Map([
        ["Servers", "Servidores"],
        ["SERVERS", "SERVIDORES"],
        ["New server", "Nuevo servidor"],
        ["Operational list of servers and collaborators.", "Lista operativa de servidores y colaboradores."],
        ["Management", "Gestión"],
        ["MANAGEMENT", "GESTIÓN"],
        ["Search", "Buscar"],
        ["Class", "Clase"],
        ["Ministry", "Ministerio"],
        ["Status", "Estado"],
        ["Type", "Tipo"],
        ["Actions", "Acciones"],
        ["Edit", "Editar"],
      ]);

  document.querySelectorAll<HTMLElement>(".sidebar, .content").forEach((root) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      const parent = node.parentElement;
      const text = node.textContent ?? "";
      const trimmed = text.trim();
      const next = pairs.get(trimmed);
      if (next && next !== trimmed && !parent?.closest(".brand-name, .topbar-title, .user-pill, .participant-badge, option")) {
        node.textContent = text.replace(trimmed, next);
      }
      node = walker.nextNode();
    }
  });
}

function getActiveLanguage() {
  const active = document.querySelector(".language-toggle button.active")?.textContent?.trim().toLowerCase();
  if (active === "en" || active === "es") return active;
  const toggleText = document.querySelector(".language-toggle")?.textContent?.replace(/\s+/g, "").toLowerCase() ?? "";
  if (toggleText.includes("/en") && !toggleText.startsWith("es/")) return "en";
  return "es";
}

function abbreviateType(value: string) {
  const normalized = normalize(value);
  if (normalized.startsWith("ministerial") || normalized === "minis.") return "MINIS";
  if (normalized.startsWith("administrativo") || normalized === "admin.") return "ADMIN";
  return value.trim().slice(0, 5).toUpperCase();
}

function translateServerTableHeaders(isEnglish: boolean) {
  const labels = isEnglish
    ? ["Name", "Class", "Ministry", "Department", "Status", "Type", "Actions"]
    : ["Nombre", "Clase", "Ministerio", "Departamento", "Estado", "Tipo", "Acciones"];

  document.querySelectorAll<HTMLTableRowElement>(".desktop-profile-table thead tr").forEach((row) => {
    const cells = Array.from(row.querySelectorAll<HTMLTableCellElement>("th"));
    if (cells.length !== labels.length) return;
    cells.forEach((cell, index) => {
      cell.textContent = labels[index];
    });
  });
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase().replace(/\s+/g, " ");
}
