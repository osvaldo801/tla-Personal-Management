import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { ImageUp, Save } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../providers/AuthProvider";
import { useOrganizationSettings } from "../providers/OrganizationProvider";
import type { OrganizationSettings } from "../types";

type FormState = Pick<
  OrganizationSettings,
  "organization_name" | "address" | "phone" | "email" | "website" | "logo_url"
>;

const MAX_LOGO_SIZE = 5 * 1024 * 1024;
const ALLOWED_LOGO_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

export function OrganizationSettingsPage() {
  const { settings, refresh } = useOrganizationSettings();
  const { authUser } = useAuth();
  const [form, setForm] = useState<FormState>({
    organization_name: settings.organization_name,
    address: settings.address,
    phone: settings.phone,
    email: settings.email,
    website: settings.website,
    logo_url: settings.logo_url,
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState(settings.logo_url);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm({
      organization_name: settings.organization_name,
      address: settings.address,
      phone: settings.phone,
      email: settings.email,
      website: settings.website,
      logo_url: settings.logo_url,
    });
    setPreviewUrl(settings.logo_url);
  }, [settings]);

  function updateField(field: keyof FormState, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value.trim() === "" && (field === "email" || field === "website") ? null : value,
    }) as FormState);
  }

  function handleLogoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setError(null);
    setMessage(null);

    if (!file) return;

    if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
      setError("El logo debe ser PNG, JPG, WEBP o SVG.");
      return;
    }

    if (file.size > MAX_LOGO_SIZE) {
      setError("El logo no puede superar 5 MB.");
      return;
    }

    setLogoFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function uploadLogoIfNeeded() {
    if (!logoFile) return form.logo_url;

    const extension = logoFile.name.split(".").pop() || "png";
    const filePath = `logos/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from("organization-assets")
      .upload(filePath, logoFile, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from("organization-assets").getPublicUrl(filePath);
    return data.publicUrl;
  }

  function validate() {
    if (!form.organization_name.trim()) return "El nombre de la organizacion es obligatorio.";
    if (!form.address.trim()) return "La direccion principal es obligatoria.";
    if (!form.phone.trim()) return "El telefono es obligatorio.";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return "El email no tiene un formato valido.";
    if (form.website && !/^https?:\/\//i.test(form.website)) return "El sitio web debe iniciar con http:// o https://.";
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSaving(true);

    try {
      const logoUrl = await uploadLogoIfNeeded();
      const payload = {
        id: settings.id,
        organization_name: form.organization_name.trim(),
        address: form.address.trim(),
        phone: form.phone.trim(),
        email: form.email?.trim() || null,
        website: form.website?.trim() || null,
        logo_url: logoUrl,
        updated_by: authUser?.id ?? null,
      };

      const { error: updateError } = await supabase
        .from("organization_settings")
        .upsert(payload, { onConflict: "id" });

      if (updateError) throw updateError;

      setLogoFile(null);
      setForm((current) => ({ ...current, logo_url: logoUrl }));
      setPreviewUrl(logoUrl);
      await refresh();
      setMessage("Configuracion guardada correctamente.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "No se pudo guardar la configuracion.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="page-stack">
      <section className="page-heading compact">
        <div>
          <p className="eyebrow">Administracion</p>
          <h1>Configuracion de Organizacion</h1>
          <p>Personaliza la informacion institucional usada en todo el sistema.</p>
        </div>
      </section>

      <form className="settings-layout" onSubmit={handleSubmit}>
        <section className="panel form-panel">
          <div className="panel-header">
            <h2>Informacion general</h2>
          </div>

          <label className="field">
            <span>Nombre de iglesia/empresa</span>
            <input
              value={form.organization_name}
              onChange={(event) => updateField("organization_name", event.target.value)}
              required
            />
          </label>

          <label className="field">
            <span>Direccion principal</span>
            <textarea
              value={form.address}
              onChange={(event) => updateField("address", event.target.value)}
              rows={3}
              required
            />
          </label>

          <div className="field-grid">
            <label className="field">
              <span>Telefono</span>
              <input value={form.phone} onChange={(event) => updateField("phone", event.target.value)} required />
            </label>

            <label className="field">
              <span>Email institucional</span>
              <input
                type="email"
                value={form.email ?? ""}
                onChange={(event) => updateField("email", event.target.value)}
                placeholder="opcional"
              />
            </label>
          </div>

          <label className="field">
            <span>Sitio web</span>
            <input
              value={form.website ?? ""}
              onChange={(event) => updateField("website", event.target.value)}
              placeholder="https://..."
            />
          </label>
        </section>

        <aside className="panel logo-panel">
          <div className="panel-header">
            <h2>Logo institucional</h2>
          </div>

          <div className="logo-preview">
            <img src={previewUrl} alt="Vista previa del logo institucional" />
          </div>

          <label className="upload-control">
            <ImageUp size={18} />
            <span>{logoFile ? logoFile.name : "Subir o reemplazar logo"}</span>
            <input type="file" accept={ALLOWED_LOGO_TYPES.join(",")} onChange={handleLogoChange} />
          </label>

          <p className="helper-text">PNG, JPG, WEBP o SVG. Maximo 5 MB.</p>

          {error && <div className="alert error">{error}</div>}
          {message && <div className="alert success">{message}</div>}

          <button className="btn btn-primary full-width" disabled={isSaving} type="submit">
            <Save size={18} />
            {isSaving ? "Guardando..." : "Guardar cambios"}
          </button>
        </aside>
      </form>
    </div>
  );
}
