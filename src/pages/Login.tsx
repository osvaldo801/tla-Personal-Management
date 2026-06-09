import { LogIn } from "lucide-react";
import { useAuth } from "../providers/AuthProvider";
import { useOrganizationSettings } from "../providers/OrganizationProvider";

export function Login() {
  const { signInWithGoogle } = useAuth();
  const { settings } = useOrganizationSettings();

  return (
    <div className="login-screen">
      <section className="login-panel">
        <img src={settings.logo_url} alt={settings.organization_name} className="login-logo" />
        <h1>{settings.organization_name}</h1>
        <p>{settings.address}</p>
        <button className="btn btn-primary" onClick={signInWithGoogle}>
          <LogIn size={18} />
          Continuar con Google
        </button>
        <span className="login-contact">{settings.phone}</span>
      </section>
    </div>
  );
}
