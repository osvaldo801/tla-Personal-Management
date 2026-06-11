export type DemoMinistry = {
  id: string;
  name: string;
  description: string;
  active: boolean;
};

export type DemoProfile = {
  id: string;
  full_name: string;
  address: string;
  phone: string;
  email: string;
  birth_date: string;
  service_start_date: string;
  service_status: string;
  service_type: "Administrativo" | "Ministerial";
  ministry: string;
  active: boolean;
  last_comment?: string;
  last_comment_author?: string;
  last_comment_at?: string;
};

export const demoMinistries: DemoMinistry[] = [];

export type DemoStatusOption = {
  id: string;
  name: string;
  active: boolean;
};

export const demoStatusOptions: DemoStatusOption[] = [
  { id: "activo", name: "Activo", active: true },
  { id: "pausado", name: "Pausado", active: true },
  { id: "cancelado", name: "Cancelado", active: true },
];

export const demoProfiles: DemoProfile[] = [];
