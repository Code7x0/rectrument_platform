export const APP_NAME = "Recruiting Partner Platform";

export const ROUTES = {
  home: "/",
  signIn: "/sign-in",
  signUp: "/sign-up",
  register: "/register",
  authCallback: "/auth/callback",
  unauthorized: "/unauthorized",
  forbidden: "/forbidden",
  superAdmin: "/super-admin",
  admin: "/admin",
  accountManager: "/account-manager",
  partner: "/partner",
} as const;

export const PUBLIC_ROUTES = [
  ROUTES.home,
  ROUTES.signIn,
  ROUTES.signUp,
  ROUTES.register,
  "/invite",
  ROUTES.unauthorized,
  ROUTES.forbidden,
] as const;

export const PROTECTED_ROUTE_PREFIXES = [
  ROUTES.superAdmin,
  ROUTES.admin,
  ROUTES.accountManager,
  ROUTES.partner,
  "/notifications",
  "/activities",
  "/settings",
  "/search",
] as const;

export const AIRTABLE_ENV_KEYS = {
  apiKey: "AIRTABLE_API_KEY",
  baseId: "AIRTABLE_BASE_ID",
  usersTable: "AIRTABLE_USERS_TABLE",
  clientsTable: "AIRTABLE_CLIENTS_TABLE",
  jobsTable: "AIRTABLE_JOBS_TABLE",
  partnersTable: "AIRTABLE_PARTNERS_TABLE",
  candidatesTable: "AIRTABLE_CANDIDATES_TABLE",
  submissionsTable: "AIRTABLE_SUBMISSIONS_TABLE",
  allocationsTable: "AIRTABLE_ALLOCATIONS_TABLE",
  documentsTable: "AIRTABLE_DOCUMENTS_TABLE",
  payoutsTable: "AIRTABLE_PAYOUTS_TABLE",
  activitiesTable: "AIRTABLE_ACTIVITIES_TABLE",
  notificationsTable: "AIRTABLE_NOTIFICATIONS_TABLE",
  notificationPreferencesTable: "AIRTABLE_NOTIFICATION_PREFERENCES_TABLE",
  settingsTable: "AIRTABLE_SETTINGS_TABLE",
} as const;
