export type UserRole = "super_admin" | "admin" | "ministry_leader";

export type AdminUser = {
  id: string;
  full_name: string | null;
  email: string;
  role: UserRole;
  ministry_id: string | null;
  created_at: string;
};

export type OrganizationSettings = {
  id: string;
  organization_name: string;
  address: string;
  phone: string;
  email: string | null;
  website: string | null;
  logo_url: string;
  updated_at: string;
  updated_by: string | null;
};

export const DEFAULT_ORGANIZATION: OrganizationSettings = {
  id: "00000000-0000-0000-0000-000000000001",
  organization_name: "Taber Los Angeles",
  address: "1000 E Washington Blvd, Los Angeles, CA 90021",
  phone: "(213) 854-5800",
  email: null,
  website: null,
  logo_url: "https://tabernaculola.net/wp-content/uploads/2019/10/New-Full-Color-470.png",
  updated_at: new Date(0).toISOString(),
  updated_by: null,
};
