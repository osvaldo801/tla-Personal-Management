import { isSupabaseConfigured, supabase } from "./lib/supabase";

type Gender = "Hombre" | "Mujer" | "";

type ServerPhotoProfile = {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  gender: Gender | null;
  photo_url: string | null;
};

let profiles: ServerPhotoProfile[] = [];
let loadingProfiles: Promise<void> | null = null;
let observerStarted = false;
let enhanceTimer = 0;

export function initProfilePhotoEnhancements() {
  if (!isSupabaseConfigured || observerStarted || typeof window === "undefined") return;
  observerStarted = true;
  void refreshProfiles().then(enhanceProfilePhotos);

  const observer = new MutationObserver(() => {
    window.clearTimeout(enhanceTimer);
    enhanceTimer = window.setTimeout(enhanceProfilePhotos, 120);
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

async function refreshProfiles() {
  if (loadingProfiles) return loadingProfiles;
  loadingProfiles = loadProfiles();
  return loadingProfiles;
}

async function loadProfiles() {
  try {
    const { data, error } = await supabase
      .from("server_profiles")
      .select("id, full_name, phone, email, address, gender, photo_url")
      .order("full_name");
    if (error) throw error;
    profiles = ((data ?? []) as ServerPhotoProfile[]).map((profile) => ({
      ...profile,
      gender: normalizeGender(profile.gender),
    }));
  } finally {
    loadingProfiles = null;
  }
}

function enhanceProfilePhotos() {
  enhanceRows();
  simplifyServerTable();
  enhanceCards();
  enhanceDetailHeader();
  enhanceGenderInfo();
  enhanceEditorGender();
}

function enhanceRows() {
  document.querySelectorAll<HTMLTableRowElement>(".desktop-profile-table tbody tr").forEach((row) => {
    if (row.dataset.photoEnhanced === "true") return;
    const nameButton = row.querySelector<HTMLButtonElement>(".link-button");
    if (!nameButton) return;
    const profile = findProfile(row.textContent ?? "", nameButton.textContent ?? "");
    if (!profile) return;
    row.dataset.photoEnhanced = "true";
    const firstCell = row.querySelector<HTMLTableCellElement>("td");
    if (!firstCell) return;
    firstCell.classList.add("photo-name-cell", "server-name-contact-cell");

    const nameWrap = document.createElement("div");
    nameWrap.className = "server-name-wrap";
    nameWrap.append(nameButton, createQuickActions(profile));
    firstCell.replaceChildren(createPhotoButton(profile, "list"), nameWrap);
  });
}

function simplifyServerTable() {
  document.querySelectorAll<HTMLTableElement>(".desktop-profile-table").forEach((table) => {
    const headers = Array.from(table.querySelectorAll<HTMLTableCellElement>("thead th"));
    const indexByText = (text: string) => headers.findIndex((header) => normalizeText(header.textContent ?? "").includes(text));
    const lastCommentIndex = indexByText("ultimo comentario");
    const typeIndex = indexByText("tipo");
    const phoneIndex = indexByText("telefono");
    const emailIndex = indexByText("email");

    if (lastCommentIndex >= 0) hideTableColumn(table, lastCommentIndex);

    table.querySelectorAll<HTMLTableRowElement>("tbody tr").forEach((row) => {
      const nameButton = row.querySelector<HTMLButtonElement>(".link-button");
      const profile = nameButton ? findProfile(row.textContent ?? "", nameButton.textContent ?? "") : findProfileByRow(row);
      const cells = Array.from(row.children) as HTMLTableCellElement[];

      if (typeIndex >= 0 && cells[typeIndex]) cells[typeIndex].textContent = abbreviateType(cells[typeIndex].textContent ?? "");
      if (profile && phoneIndex >= 0 && cells[phoneIndex]) replaceCellWithIcon(cells[phoneIndex], createContactLink("phone", profile));
      if (profile && emailIndex >= 0 && cells[emailIndex]) replaceCellWithIcon(cells[emailIndex], createContactLink("email", profile));
    });
  });
}

function hideTableColumn(table: HTMLTableElement, index: number) {
  table.querySelectorAll<HTMLTableRowElement>("tr").forEach((row) => {
    const cell = row.children[index] as HTMLElement | undefined;
    if (cell) cell.style.display = "none";
  });
}

function replaceCellWithIcon(cell: HTMLTableCellElement, link: HTMLAnchorElement | null) {
  if (cell.dataset.compactContact === "true") return;
  cell.dataset.compactContact = "true";
  cell.classList.add("compact-contact-cell");
  cell.replaceChildren(link ?? emptyContactIcon());
}

function createQuickActions(profile: ServerPhotoProfile) {
  const actions = document.createElement("div");
  actions.className = "profile-quick-actions";
  const maps = createContactLink("map", profile);
  const phone = createContactLink("phone", profile);
  const text = createContactLink("text", profile);
  const email = createContactLink("email", profile);
  [maps, phone, text, email].forEach((link) => {
    if (link) actions.append(link);
  });
  return actions;
}

function createContactLink(kind: "map" | "phone" | "text" | "email", profile: ServerPhotoProfile) {
  const link = document.createElement("a");
  link.className = `quick-contact quick-contact-${kind}`;
  link.target = kind === "map" ? "_blank" : "";
  link.rel = kind === "map" ? "noreferrer" : "";

  if (kind === "map") {
    if (!profile.address) return null;
    link.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(profile.address)}`;
    link.title = "Abrir direccion en Google Maps";
    link.textContent = "⌖";
  }
  if (kind === "phone") {
    if (!profile.phone) return null;
    link.href = `tel:${normalizePhone(profile.phone)}`;
    link.title = "Llamar";
    link.textContent = "☎";
  }
  if (kind === "text") {
    if (!profile.phone) return null;
    link.href = `sms:${normalizePhone(profile.phone)}`;
    link.title = "Mandar texto";
    link.textContent = "✉";
  }
  if (kind === "email") {
    if (!profile.email) return null;
    link.href = `mailto:${profile.email}`;
    link.title = "Enviar email";
    link.textContent = "@";
  }

  link.addEventListener("click", (event) => event.stopPropagation());
  return link;
}

function emptyContactIcon() {
  const span = document.createElement("span");
  span.className = "quick-contact quick-contact-empty";
  span.textContent = "-";
  return span;
}

function enhanceCards() {
  document.querySelectorAll<HTMLElement>(".profile-card").forEach((card) => {
    if (card.dataset.photoEnhanced === "true") return;
    const nameButton = card.querySelector<HTMLButtonElement>(".profile-card-title, .link-button");
    if (!nameButton) return;
    const profile = findProfile(card.textContent ?? "", nameButton.textContent ?? "");
    if (!profile) return;
    card.dataset.photoEnhanced = "true";
    const header = document.createElement("div");
    header.className = "enhanced-profile-card-head";
    const photo = createPhotoButton(profile, "small");
    const textWrap = document.createElement("div");
    nameButton.parentElement?.insertBefore(header, nameButton);
    header.append(photo, textWrap);
    textWrap.append(nameButton, createQuickActions(profile));
    const badge = card.querySelector<HTMLElement>(".participant-badge");
    if (badge) textWrap.append(badge);
  });
}

function enhanceDetailHeader() {
  const heading = document.querySelector<HTMLElement>(".profile-detail-heading");
  if (!heading || heading.dataset.photoEnhanced === "true") return;
  const title = heading.querySelector<HTMLHeadingElement>("h1");
  if (!title) return;
  const profile = findProfile(document.body.textContent ?? "", title.textContent ?? "");
  if (!profile) return;
  heading.dataset.photoEnhanced = "true";
  const wrap = document.createElement("div");
  wrap.className = "enhanced-detail-title";
  const titleParent = title.parentElement;
  if (!titleParent) return;
  titleParent.parentElement?.insertBefore(wrap, titleParent);
  wrap.append(createPhotoButton(profile, "large"), titleParent);
}

function enhanceGenderInfo() {
  const panel = document.querySelector<HTMLElement>(".profile-info-panel");
  if (!panel || panel.querySelector(".gender-info-enhancement")) return;
  const title = document.querySelector<HTMLHeadingElement>(".profile-detail-heading h1");
  if (!title) return;
  const profile = findProfile(panel.textContent ?? "", title.textContent ?? "");
  if (!profile) return;
  const classRow = Array.from(panel.querySelectorAll<HTMLElement>(".info-row")).find((row) => row.textContent?.includes("Clase"));
  const row = document.createElement("div");
  row.className = "info-row gender-info-enhancement";
  const label = document.createElement("span");
  label.textContent = "Género";
  const select = createGenderSelect(profile);
  row.append(label, select);
  classRow?.after(row);
}

function enhanceEditorGender() {
  const editor = document.querySelector<HTMLFormElement>(".profile-editor");
  if (!editor || editor.querySelector(".gender-editor-enhancement")) return;
  const profile = findProfile(editor.textContent ?? "", inputValue(editor, "Nombre completo"));
  const classField = Array.from(editor.querySelectorAll<HTMLElement>(".field")).find((field) => field.textContent?.includes("Clase"));
  const field = document.createElement("label");
  field.className = "field gender-editor-enhancement";
  const label = document.createElement("span");
  label.textContent = "Género";
  field.append(label, createGenderSelect(profile));
  classField?.after(field);
}

function createGenderSelect(profile: ServerPhotoProfile | null) {
  const select = document.createElement("select");
  ["", "Hombre", "Mujer"].forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value || "Sin definir";
    select.append(option);
  });
  select.value = profile?.gender ?? "";
  select.addEventListener("change", async () => {
    if (!profile) return;
    const gender = normalizeGender(select.value);
    const { error } = await supabase.from("server_profiles").update({ gender: gender || null }).eq("id", profile.id);
    if (error) {
      window.alert("No se pudo guardar el género.");
      return;
    }
    profile.gender = gender;
    document.querySelectorAll(`[data-profile-photo-id="${profile.id}"]`).forEach((node) => renderPhoto(node as HTMLElement, profile));
  });
  return select;
}

function createPhotoButton(profile: ServerPhotoProfile, size: "small" | "large" | "list") {
  const button = document.createElement("button");
  button.className = `enhanced-profile-photo enhanced-profile-photo-${size}`;
  button.type = "button";
  button.title = "Ver o reemplazar foto";
  button.dataset.profilePhotoId = profile.id;
  renderPhoto(button, profile);
  button.addEventListener("click", () => openPhotoDialog(profile));
  return button;
}

function renderPhoto(target: HTMLElement, profile: ServerPhotoProfile) {
  const initials = getInitials(profile.full_name);
  const genderClass = profile.gender === "Mujer" ? "female" : profile.gender === "Hombre" ? "male" : "neutral";
  target.classList.remove("male", "female", "neutral");
  target.classList.add(genderClass);
  target.innerHTML = profile.photo_url
    ? `<img src="${escapeAttr(profile.photo_url)}" alt="${escapeAttr(profile.full_name)}" />`
    : `<span>${initials}</span>`;
}

function openPhotoDialog(profile: ServerPhotoProfile) {
  document.querySelector(".profile-photo-dialog")?.remove();
  const overlay = document.createElement("div");
  overlay.className = "profile-photo-dialog";
  overlay.innerHTML = `
    <div class="profile-photo-dialog-card" role="dialog" aria-modal="true">
      <button class="profile-photo-dialog-close" type="button" aria-label="Cerrar">×</button>
      <div class="profile-photo-preview-area">
        <div class="profile-photo-id-frame" data-photo-preview></div>
      </div>
      <div class="profile-photo-crop-tools" hidden>
        <label>Zoom <input type="range" min="1" max="2.5" step="0.05" value="1" data-photo-zoom /></label>
      </div>
      <div class="profile-photo-dialog-actions">
        <button class="btn btn-secondary" type="button" data-photo-pick>Subir nueva</button>
        <button class="btn btn-primary" type="button" data-photo-save hidden>Guardar foto ID</button>
      </div>
    </div>`;
  document.body.append(overlay);

  const close = () => overlay.remove();
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) close();
  });
  overlay.querySelector<HTMLButtonElement>(".profile-photo-dialog-close")?.addEventListener("click", close);

  const preview = overlay.querySelector<HTMLElement>("[data-photo-preview]");
  const zoom = overlay.querySelector<HTMLInputElement>("[data-photo-zoom]");
  const save = overlay.querySelector<HTMLButtonElement>("[data-photo-save]");
  const tools = overlay.querySelector<HTMLElement>(".profile-photo-crop-tools");
  if (!preview || !zoom || !save || !tools) return;

  renderDialogPreview(preview, profile);
  let selectedImage: HTMLImageElement | null = null;
  let selectedFileName = "profile.jpg";

  overlay.querySelector<HTMLButtonElement>("[data-photo-pick]")?.addEventListener("click", () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      selectedFileName = file.name;
      const url = URL.createObjectURL(file);
      selectedImage = new Image();
      selectedImage.onload = () => URL.revokeObjectURL(url);
      selectedImage.src = url;
      preview.innerHTML = `<img src="${escapeAttr(url)}" alt="${escapeAttr(profile.full_name)}" />`;
      tools.hidden = false;
      save.hidden = false;
      updatePreviewZoom(preview, zoom.value);
    };
    input.click();
  });

  zoom.addEventListener("input", () => updatePreviewZoom(preview, zoom.value));
  save.addEventListener("click", async () => {
    if (!selectedImage) return;
    const blob = await cropImageForId(selectedImage, Number(zoom.value));
    await saveProfilePhoto(profile, blob, selectedFileName);
    close();
  });
}

function renderDialogPreview(preview: HTMLElement, profile: ServerPhotoProfile) {
  preview.innerHTML = profile.photo_url
    ? `<img src="${escapeAttr(profile.photo_url)}" alt="${escapeAttr(profile.full_name)}" />`
    : `<span>${getInitials(profile.full_name)}</span>`;
}

function updatePreviewZoom(preview: HTMLElement, zoom: string) {
  const image = preview.querySelector<HTMLImageElement>("img");
  if (image) image.style.transform = `scale(${zoom})`;
}

function cropImageForId(image: HTMLImageElement, zoom: number) {
  const canvas = document.createElement("canvas");
  canvas.width = 600;
  canvas.height = 750;
  const context = canvas.getContext("2d");
  if (!context) return Promise.resolve(new Blob());
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);

  const targetRatio = canvas.width / canvas.height;
  const imageRatio = image.naturalWidth / image.naturalHeight;
  let sourceWidth = image.naturalWidth;
  let sourceHeight = image.naturalHeight;
  if (imageRatio > targetRatio) sourceWidth = image.naturalHeight * targetRatio;
  else sourceHeight = image.naturalWidth / targetRatio;

  sourceWidth = Math.max(1, sourceWidth / zoom);
  sourceHeight = Math.max(1, sourceHeight / zoom);
  const sourceX = (image.naturalWidth - sourceWidth) / 2;
  const sourceY = (image.naturalHeight - sourceHeight) / 2;
  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);

  return new Promise<Blob>((resolve) => canvas.toBlob((blob) => resolve(blob ?? new Blob()), "image/jpeg", 0.9));
}

async function saveProfilePhoto(profile: ServerPhotoProfile, blob: Blob, originalName: string) {
  const safeName = originalName.replace(/[^a-z0-9._-]/gi, "-").replace(/\.+/g, ".");
  const path = `${profile.id}/${Date.now()}-${safeName || "profile.jpg"}`;
  const upload = await supabase.storage.from("server-photos").upload(path, blob, { cacheControl: "3600", contentType: "image/jpeg", upsert: true });
  if (upload.error) {
    window.alert("No se pudo subir la foto.");
    return;
  }
  const { data } = supabase.storage.from("server-photos").getPublicUrl(path);
  const update = await supabase.from("server_profiles").update({ photo_url: data.publicUrl }).eq("id", profile.id);
  if (update.error) {
    window.alert("La foto subió, pero no se pudo guardar en el perfil.");
    return;
  }
  profile.photo_url = data.publicUrl;
  document.querySelectorAll(`[data-profile-photo-id="${profile.id}"]`).forEach((node) => renderPhoto(node as HTMLElement, profile));
}

function findProfileByRow(row: HTMLTableRowElement) {
  const email = row.textContent?.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]?.toLowerCase() ?? "";
  const phone = normalizePhone(row.textContent ?? "");
  return profiles.find((profile) => {
    if (email && (profile.email ?? "").toLowerCase() === email) return true;
    const profilePhone = normalizePhone(profile.phone ?? "");
    return Boolean(profilePhone && phone.includes(profilePhone));
  }) ?? null;
}

function abbreviateType(value: string) {
  const normalized = normalizeText(value);
  if (normalized.startsWith("ministerial")) return "MINIS.";
  if (normalized.startsWith("administrativo")) return "ADMIN.";
  return value.trim().slice(0, 5).toUpperCase();
}

function findProfile(containerText: string, name: string) {
  const normalizedName = normalizeText(name);
  const email = containerText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]?.toLowerCase() ?? "";
  const phone = normalizePhone(containerText);
  return profiles.find((profile) => {
    if (normalizeText(profile.full_name) !== normalizedName) return false;
    if (email && (profile.email ?? "").toLowerCase() === email) return true;
    if (phone && normalizePhone(profile.phone ?? "") && phone.includes(normalizePhone(profile.phone ?? ""))) return true;
    return !email && !phone;
  }) ?? null;
}

function inputValue(form: HTMLElement, labelText: string) {
  const field = Array.from(form.querySelectorAll<HTMLLabelElement>("label")).find((label) => label.textContent?.includes(labelText));
  return field?.querySelector<HTMLInputElement>("input")?.value ?? "";
}

function normalizeGender(value: string | null | undefined): Gender {
  if (value === "Hombre" || value === "Mujer") return value;
  return "";
}

function normalizeText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

function getInitials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "?";
}

function escapeAttr(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
