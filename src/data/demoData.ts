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
  service_status: "Activo" | "Pausado" | "Cancelado";
  service_type: "Administrativo" | "Ministerial";
  ministry: string;
  active: boolean;
};

export const demoMinistries: DemoMinistry[] = [
  { id: "libreria", name: "Libreria", description: "Equipo de libreria y recursos.", active: true },
  { id: "cafeteria", name: "Cafeteria", description: "Servicio de cafeteria.", active: true },
  { id: "acomodacion", name: "Acomodacion", description: "Recepcion y apoyo en asientos.", active: true },
  { id: "alabanza", name: "Alabanza", description: "Equipo musical y vocal.", active: true },
  { id: "media", name: "Media", description: "Audio, video y transmision.", active: true },
];

export const demoProfiles: DemoProfile[] = [
  { id: "ana-martinez", full_name: "Ana Martinez", address: "1120 E 12th St, Los Angeles, CA 90021", phone: "(213) 555-0101", email: "ana.martinez@example.com", birth_date: "1991-04-12", service_start_date: "2022-01-15", service_status: "Activo", service_type: "Ministerial", ministry: "Alabanza", active: true },
  { id: "carlos-rivera", full_name: "Carlos Rivera", address: "2401 S Main St, Los Angeles, CA 90007", phone: "(213) 555-0102", email: "carlos.rivera@example.com", birth_date: "1987-09-03", service_start_date: "2021-06-20", service_status: "Activo", service_type: "Administrativo", ministry: "Media", active: true },
  { id: "sofia-hernandez", full_name: "Sofia Hernandez", address: "815 E 7th St, Los Angeles, CA 90021", phone: "(213) 555-0103", email: "sofia.hernandez@example.com", birth_date: "1995-11-22", service_start_date: "2023-03-05", service_status: "Activo", service_type: "Ministerial", ministry: "Acomodacion", active: true },
  { id: "miguel-torres", full_name: "Miguel Torres", address: "1435 S Central Ave, Los Angeles, CA 90021", phone: "(213) 555-0104", email: "miguel.torres@example.com", birth_date: "1982-02-18", service_start_date: "2020-10-12", service_status: "Pausado", service_type: "Ministerial", ministry: "Cafeteria", active: true },
  { id: "laura-gomez", full_name: "Laura Gomez", address: "920 E Pico Blvd, Los Angeles, CA 90021", phone: "(213) 555-0105", email: "laura.gomez@example.com", birth_date: "1990-07-30", service_start_date: "2022-08-01", service_status: "Activo", service_type: "Administrativo", ministry: "Libreria", active: true },
  { id: "jose-ramirez", full_name: "Jose Ramirez", address: "1600 Maple Ave, Los Angeles, CA 90015", phone: "(213) 555-0106", email: "jose.ramirez@example.com", birth_date: "1978-12-09", service_start_date: "2019-04-18", service_status: "Activo", service_type: "Ministerial", ministry: "Acomodacion", active: true },
  { id: "daniela-cruz", full_name: "Daniela Cruz", address: "510 S Alameda St, Los Angeles, CA 90013", phone: "(213) 555-0107", email: "daniela.cruz@example.com", birth_date: "1998-05-27", service_start_date: "2024-02-10", service_status: "Activo", service_type: "Ministerial", ministry: "Media", active: true },
  { id: "roberto-flores", full_name: "Roberto Flores", address: "1330 E Olympic Blvd, Los Angeles, CA 90021", phone: "(213) 555-0108", email: "roberto.flores@example.com", birth_date: "1985-01-14", service_start_date: "2021-11-06", service_status: "Cancelado", service_type: "Ministerial", ministry: "Alabanza", active: false },
  { id: "paola-morales", full_name: "Paola Morales", address: "735 Kohler St, Los Angeles, CA 90021", phone: "(213) 555-0109", email: "paola.morales@example.com", birth_date: "1993-08-16", service_start_date: "2023-09-14", service_status: "Activo", service_type: "Administrativo", ministry: "Cafeteria", active: true },
  { id: "andres-castillo", full_name: "Andres Castillo", address: "1025 S San Pedro St, Los Angeles, CA 90015", phone: "(213) 555-0110", email: "andres.castillo@example.com", birth_date: "1989-03-21", service_start_date: "2022-05-25", service_status: "Activo", service_type: "Ministerial", ministry: "Libreria", active: true },
];
