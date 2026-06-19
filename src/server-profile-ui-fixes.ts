import { isSupabaseConfigured, supabase } from "./lib/supabase";

type ExtraField = {
  key: string;
  label: string;
  multiline?: boolean;
};

const extraFields: ExtraField[] = [
  { key: "marital_status", label: "Estado civil" },
  { key: "emergency_contact_name", label: "Contacto de emergencia" },
  { key: "emergency_contact_phone", label: "Telefono de emergencia" },
  { key: "baptism_status", label: "Bautismo" },
  { key: "profession_year", label: "Ano profesion de fe" },
  { key: "membership_since_year", label: "Ano en Taber LA" },
  { key: "membership_classes", label: "Clases de membresia", multiline: true },
  { key: "service_availability", label: "Disponibilidad", multiline: true },
  { key: "skills_talents", label: "Habilidades o talentos", multiline: true },
  { key: "service_ministries", label: "Ministerios de servicio", multiline: true },
];

let observerStarted = false;
let timer = 0;

export function initServerProfileUiFixes() {
  if (observerStarted || typeof window === "undefined") return;
  observerStarted = true;

  const run = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      normalizeDirectActionIcons();
      enhanceProfileEditor();
    }, 80);
  };

  run();
  document.addEventListener("submit", handleProfileEditorSubmit, true);
  const observer = new MutationObserver(run);
  observer.observe(document.body, { childList: true, subtree: true });
}

function normalizeDirectActionIcons() {
  document.querySelectorAll<HTMLElement>(".profile-quick-actions").forEach((actions) => {
    if (actions.dataset.normalizedIcons === "true") return;
    actions.dataset.normalizedIcons = "true";

    const phone = actions.querySelector<HTMLAnchorElement>(".quick-contact-phone");
    const text = actions.querySelector<HTMLAnchorElement>(".quick-contact-text");
    const email = actions.querySelector<HTMLAnchorElement>(".quick-contact-email");
    const map = actions.querySelector<HTMLAnchorElement>(".quick-contact-map");

    setIcon(phone, "phone");
    setIcon(text, "text");
    setIcon(email, "email");
    setIcon(map, "map");

    [phone, text, email, map].forEach((link) => {
      if (link) actions.append(link);
    });
  });
}

function setIcon(link: HTMLAnchorElement | null, kind: "phone" | "text" | "email" | "map") {
  if (!link) return;
  link.innerHTML = iconSvg(kind);
}

function iconSvg(kind: "phone" | "text" | "email" | "map") {
  const paths = {
    phone: '<path d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384"/>',
    text: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    email: '<path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7"/><rect x="2" y="4" width="20" height="16" rx="2"/>',
    map: '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
  };
  return `<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths[kind]}</svg>`;
}

function enhanceProfileEditor() {
  document.querySelectorAll<HTMLFormElement>(".profile-editor").forEach((form) => {
    if (form.dataset.extraFieldsEnhanced === "true") return;
    form.dataset.extraFieldsEnhanced = "true";

    const grid = form.querySelector<HTMLElement>(".profile-editor-grid");
    if (!grid) return;

    const profileKey = getEditorProfileKey(form);
    extraFields.forEach((field) => grid.append(createExtraField(field)));
    if (profileKey && isSupabaseConfigured) void fillExtraFields(form, profileKey);
  });
}

function createExtraField(field: ExtraField) {
  const label = document.createElement("label");
  label.className = field.multiline ? "field field-wide profile-extra-field" : "field profile-extra-field";
  label.dataset.extraField = field.key;

  const title = document.createElement("span");
  title.textContent = field.label;
  label.append(title);

  const control = field.multiline ? document.createElement("textarea") : document.createElement("input");
  control.name = field.key;
  if (field.multiline) (control as HTMLTextAreaElement).rows = 3;
  label.append(control);
  return label;
}

async function fillExtraFields(form: HTMLFormElement, profileKey: { fullName: string; email: string }) {
  const query = supabase
    .from("server_profiles")
    .select("marital_status, emergency_contact_name, emergency_contact_phone, baptism_status, profession_year, membership_since_year, membership_classes, service_availability, skills_talents, service_ministries")
    .eq("full_name", profileKey.fullName)
    .maybeSingle();

  const { data, error } = profileKey.email
    ? await supabase
        .from("server_profiles")
        .select("marital_status, emergency_contact_name, emergency_contact_phone, baptism_status, profession_year, membership_since_year, membership_classes, service_availability, skills_talents, service_ministries")
        .eq("email", profileKey.email)
        .maybeSingle()
    : await query;

  if (error || !data) return;
  Object.entries(data).forEach(([key, value]) => {
    const control = form.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${key}"]`);
    if (control) control.value = String(value ?? "");
  });
}

function handleProfileEditorSubmit(event: Event) {
  const form = event.target instanceof HTMLFormElement ? event.target : null;
  if (!form?.classList.contains("profile-editor") || !isSupabaseConfigured) return;

  const profileKey = getEditorProfileKey(form);
  if (!profileKey?.fullName) return;

  const extraPayload = collectExtraPayload(form);
  window.setTimeout(() => void saveExtraFields(profileKey, extraPayload), 900);
}

function collectExtraPayload(form: HTMLFormElement) {
  return Object.fromEntries(
    extraFields.map((field) => {
      const control = form.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${field.key}"]`);
      const value = control?.value.trim() ?? "";
      return [field.key, value || null];
    }),
  );
}

async function saveExtraFields(profileKey: { fullName: string; email: string }, payload: Record<string, string | null>) {
  let id = "";
  if (profileKey.email) {
    const { data } = await supabase.from("server_profiles").select("id").eq("email", profileKey.email).order("created_at", { ascending: false }).limit(1).maybeSingle();
    id = data?.id ?? "";
  }
  if (!id) {
    const { data } = await supabase.from("server_profiles").select("id").eq("full_name", profileKey.fullName).order("created_at", { ascending: false }).limit(1).maybeSingle();
    id = data?.id ?? "";
  }
  if (!id) return;
  await supabase.from("server_profiles").update(payload).eq("id", id);
}

function getEditorProfileKey(form: HTMLFormElement) {
  const fullName = getFieldValue(form, "Nombre completo");
  const email = getFieldValue(form, "Email");
  return fullName ? { fullName, email } : null;
}

function getFieldValue(form: HTMLFormElement, labelText: string) {
  const label = Array.from(form.querySelectorAll<HTMLLabelElement>("label")).find((item) => normalize(item.textContent ?? "").startsWith(normalize(labelText)));
  return label?.querySelector<HTMLInputElement>("input")?.value.trim() ?? "";
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase().replace(/\s+/g, " ");
}
