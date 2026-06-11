import { LogIn } from "lucide-react";
import type { Language } from "../App";
import { useAuth } from "../providers/AuthProvider";
import { useOrganizationSettings } from "../providers/OrganizationProvider";

const copy = {
  es: {
    continueWithGoogle: "Continuar con Google",
  },
  en: {
    continueWithGoogle: "Continue with Google",
  },
};

export function Login({ language = "es" }: { language?: Language }) {
  const { signInWithGoogle } = useAuth();
  const { settings } = useOrganizationSettings();
  const t = copy[language];

  return (
    <div className="login-screen">
      <section className="login-panel">
        <img src={settings.logo_url} alt={settings.organization_name} className="login-logo" />
        <h1>{settings.organization_name}</h1>
        <p>{settings.address}</p>
        <button className="btn btn-primary" onClick={signInWithGoogle}>
          <LogIn size={18} />
          {t.continueWithGoogle}
        </button>
        <span className="login-contact">{settings.phone}</span>
      </section>
    </div>
  );
}
