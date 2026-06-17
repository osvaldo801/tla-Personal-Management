export function initServerTableColumnFixes() {
  if (typeof window === "undefined") return;

  const run = () => window.setTimeout(normalizeServerTables, 60);
  run();
  const observer = new MutationObserver(run);
  observer.observe(document.body, { childList: true, subtree: true });
}

function normalizeServerTables() {
  document.querySelectorAll<HTMLTableElement>(".desktop-profile-table table").forEach((table) => {
    normalizeHeader(table);
    normalizeRows(table);
    table.querySelectorAll<HTMLTableCellElement>("td[colspan]").forEach((cell) => cell.setAttribute("colspan", "7"));
  });
}

function normalizeHeader(table: HTMLTableElement) {
  const headerRow = table.querySelector<HTMLTableRowElement>("thead tr");
  if (!headerRow) return;
  const headers = Array.from(headerRow.children) as HTMLTableCellElement[];
  if (headers.length === 7 && normalize(headers[6].textContent ?? "") === "acciones") return;

  const keep = headers.filter((header) => {
    const text = normalize(header.textContent ?? "");
    return text !== "telefono" && text !== "email" && text !== "ultimo comentario";
  });
  if (keep.length) headerRow.replaceChildren(...keep);
}

function normalizeRows(table: HTMLTableElement) {
  table.querySelectorAll<HTMLTableRowElement>("tbody tr").forEach((row) => {
    const cells = Array.from(row.children) as HTMLTableCellElement[];
    if (cells.length <= 7) return;

    const actionCell = cells.find((cell) => Boolean(cell.querySelector(".row-actions"))) ?? cells[cells.length - 1];
    const keep = [...cells.slice(0, 6), actionCell].filter(Boolean);
    row.replaceChildren(...keep);
  });
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase().replace(/\s+/g, " ");
}
