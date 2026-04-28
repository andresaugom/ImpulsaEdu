/**
 * ImpulsaEdu API Documentation MCP Server
 *
 * Exposes structured tools so AI coding agents can query the ImpulsaEdu
 * backend API contracts without parsing a large markdown file.
 *
 * Tools:
 *   list_endpoints               – list all available endpoints
 *   get_endpoint_details         – full spec for a single endpoint
 *   get_typescript_types         – TypeScript interfaces for a resource
 *   get_implementation_status    – what is already built in frontend/src/lib/
 *   get_service_pattern          – code template + example for a new service file
 *   get_frontend_component_status – which UI components are wired to real services vs mock data
 */

'use strict';

const { Server }             = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} = require('@modelcontextprotocol/sdk/types.js');

// ── API data ──────────────────────────────────────────────────────────────────

const ENDPOINTS = [
  // ── auth service ────────────────────────────────────────────────────────────
  {
    id: 'auth.register',
    method: 'POST',
    path: '/auth/register',
    service: 'auth',
    auth: 'none',
    summary: 'Create a new user account. Role auto-assigned: @schoolfinder.org → admin, others → staff.',
    requestBody: { email: 'string', password: 'string', firstname: 'string', lastname: 'string' },
    response: { status: 201, body: { message: 'string', user: { id: 'string (uuid)', role: 'string' } } },
    errors: [
      { code: 'missing_fields', http: 400, reason: 'email, password, firstname, or lastname absent' },
      { code: 'user_exists', http: 400, reason: 'Email already registered' },
      { code: 'db_error', http: 500, reason: 'Database failure' },
    ],
    notes: [],
  },
  {
    id: 'auth.login',
    method: 'POST',
    path: '/auth/login',
    service: 'auth',
    auth: 'none',
    summary: 'Exchange credentials for an accessToken + refreshToken pair.',
    requestBody: { email: 'string', password: 'string' },
    response: {
      status: 200,
      body: { accessToken: 'string (JWT, 15 min)', refreshToken: 'string (opaque hex, 7 days)' },
    },
    errors: [
      { code: 'invalid_credentials', http: 401, reason: 'Wrong email or password' },
      { code: 'db_error', http: 500, reason: 'Database failure' },
    ],
    notes: ['Fields are camelCase — accessToken / refreshToken, NOT access_token / refresh_token.'],
  },
  {
    id: 'auth.refresh',
    method: 'POST',
    path: '/auth/refresh',
    service: 'auth',
    auth: 'none',
    summary: 'Rotate tokens. Old refreshToken is deleted; new pair issued.',
    requestBody: { refreshToken: 'string' },
    response: { status: 200, body: { accessToken: 'string (JWT)', refreshToken: 'string (opaque hex)' } },
    errors: [
      { code: 'refresh_token_required', http: 400, reason: 'Body missing refreshToken' },
      { code: 'invalid_token', http: 401, reason: 'Token expired, revoked, or not found' },
      { code: 'refresh_error', http: 500, reason: 'Database failure' },
    ],
    notes: [],
  },
  {
    id: 'auth.me',
    method: 'GET',
    path: '/auth/me',
    service: 'auth',
    auth: 'staff',
    summary: 'Return authenticated user profile.',
    requestBody: null,
    response: {
      status: 200,
      body: {
        id: 'string (uuid)',
        firstname: 'string',
        lastname: 'string',
        email: 'string',
        role: 'admin | staff',
        created_at: 'ISO 8601 string',
      },
    },
    errors: [
      { code: 'token_required', http: 401, reason: 'No bearer token' },
      { code: 'invalid_access_token', http: 403, reason: 'Bad or expired token' },
      { code: 'user_not_found', http: 404, reason: 'Token valid but user deleted' },
      { code: 'db_error', http: 500, reason: 'Database failure' },
    ],
    notes: ['Returns firstname / lastname separately, not full_name.'],
  },
  {
    id: 'auth.logout',
    method: 'POST',
    path: '/auth/logout',
    service: 'auth',
    auth: 'none',
    summary: 'Revoke the refresh token. Access token is not blocklisted (short TTL).',
    requestBody: { refreshToken: 'string' },
    response: { status: 200, body: { message: 'string' } },
    errors: [
      { code: 'token_required', http: 400, reason: 'Body missing refreshToken' },
      { code: 'logout_error', http: 500, reason: 'Database failure' },
    ],
    notes: [],
  },

  // ── users ────────────────────────────────────────────────────────────────────
  {
    id: 'users.list',
    method: 'GET',
    path: '/api/v1/users',
    service: 'app_api',
    auth: 'admin',
    summary: 'List all users. Filterable by role and is_active.',
    queryParams: [
      { name: 'role', type: 'admin | staff', optional: true },
      { name: 'is_active', type: 'true | false', optional: true },
    ],
    requestBody: null,
    response: {
      status: 200,
      body: {
        items: '[{ id, email, full_name, role, is_active }]',
        total: 'number',
      },
    },
    errors: [
      { code: 'UNAUTHORIZED', http: 401 },
      { code: 'FORBIDDEN', http: 403, reason: 'Not admin' },
    ],
    notes: [],
  },
  {
    id: 'users.get',
    method: 'GET',
    path: '/api/v1/users/:id',
    service: 'app_api',
    auth: 'staff (own id) | admin (any)',
    summary: 'Get a single user by id.',
    requestBody: null,
    response: {
      status: 200,
      body: { id: 'string', email: 'string', full_name: 'string', role: 'admin | staff', is_active: 'boolean' },
    },
    errors: [
      { code: 'FORBIDDEN', http: 403, reason: 'Staff accessing another user' },
      { code: 'NOT_FOUND', http: 404 },
    ],
    notes: [],
  },
  {
    id: 'users.create',
    method: 'POST',
    path: '/api/v1/users',
    service: 'app_api',
    auth: 'admin',
    summary: 'Create a new NGO user.',
    requestBody: { email: 'string', password: 'string', full_name: 'string', role: 'staff | admin' },
    response: { status: 201, body: '{ id, email, full_name, role, is_active }' },
    errors: [
      { code: 'MISSING_FIELDS', http: 400 },
      { code: 'INVALID_ROLE', http: 400 },
      { code: 'EMAIL_CONFLICT', http: 409 },
    ],
    notes: [],
  },
  {
    id: 'users.update',
    method: 'PUT',
    path: '/api/v1/users/:id',
    service: 'app_api',
    auth: 'staff (own id) | admin (any)',
    summary: 'Update full_name and/or password.',
    requestBody: { full_name: 'string (optional)', password: 'string (optional)' },
    response: { status: 200, body: '{ id, email, full_name, role, is_active }' },
    errors: [
      { code: 'MISSING_FIELDS', http: 400, reason: 'Neither field provided' },
      { code: 'NOT_FOUND', http: 404 },
    ],
    notes: [],
  },
  {
    id: 'users.deactivate',
    method: 'PATCH',
    path: '/api/v1/users/:id/deactivate',
    service: 'app_api',
    auth: 'admin',
    summary: 'Soft-delete user (sets deleted_at).',
    requestBody: null,
    response: { status: 200, body: { message: 'User deactivated' } },
    errors: [{ code: 'NOT_FOUND', http: 404 }],
    notes: [],
  },

  // ── schools ──────────────────────────────────────────────────────────────────
  {
    id: 'schools.list',
    method: 'GET',
    path: '/api/v1/schools',
    service: 'app_api',
    auth: 'none (public)',
    summary: 'Paginated list of schools.',
    queryParams: [
      { name: 'region', type: 'string', optional: true },
      { name: 'category', type: 'string', optional: true },
      { name: 'status', type: 'active | archived', optional: true, default: 'active' },
      { name: 'page', type: 'integer', optional: true, default: 1 },
      { name: 'per_page', type: 'integer (max 100)', optional: true, default: 20 },
    ],
    requestBody: null,
    response: { status: 200, body: '{ items: ApiSchool[], total, page, per_page }' },
    errors: [],
    notes: ['Defined in schoolsService.ts — already implemented.'],
  },
  {
    id: 'schools.get',
    method: 'GET',
    path: '/api/v1/schools/:id',
    service: 'app_api',
    auth: 'none (public)',
    summary: 'Get a single school.',
    requestBody: null,
    response: { status: 200, body: 'ApiSchool' },
    errors: [{ code: 'NOT_FOUND', http: 404 }],
    notes: ['Defined in schoolsService.ts — already implemented.'],
  },
  {
    id: 'schools.create',
    method: 'POST',
    path: '/api/v1/schools',
    service: 'app_api',
    auth: 'staff',
    summary: 'Create a school.',
    requestBody: { name: 'string', region: 'string', category: 'string', description: 'string (optional)', funding_goal: 'number' },
    response: { status: 201, body: 'ApiSchool' },
    errors: [{ code: 'MISSING_FIELDS', http: 400 }, { code: 'CONFLICT', http: 409 }],
    notes: ['Defined in schoolsService.ts — already implemented.'],
  },
  {
    id: 'schools.update',
    method: 'PUT',
    path: '/api/v1/schools/:id',
    service: 'app_api',
    auth: 'staff',
    summary: 'Partial update of school fields.',
    requestBody: { name: 'string?', region: 'string?', category: 'string?', description: 'string?', funding_goal: 'number?' },
    response: { status: 200, body: 'ApiSchool' },
    errors: [{ code: 'MISSING_FIELDS', http: 400 }, { code: 'NOT_FOUND', http: 404 }, { code: 'CONFLICT', http: 409 }],
    notes: ['Defined in schoolsService.ts — already implemented.'],
  },
  {
    id: 'schools.archive',
    method: 'PATCH',
    path: '/api/v1/schools/:id/archive',
    service: 'app_api',
    auth: 'staff',
    summary: 'Archive school (status = archived). Archived schools cannot receive donations.',
    requestBody: null,
    response: { status: 200, body: { message: 'School archived' } },
    errors: [{ code: 'NOT_FOUND', http: 404 }],
    notes: ['Defined in schoolsService.ts — already implemented.'],
  },

  // ── donors ───────────────────────────────────────────────────────────────────
  {
    id: 'donors.list',
    method: 'GET',
    path: '/api/v1/donors',
    service: 'app_api',
    auth: 'staff',
    summary: 'Paginated list of donors.',
    queryParams: [
      { name: 'type', type: 'individual | corporate', optional: true },
      { name: 'name', type: 'string (partial match)', optional: true },
      { name: 'is_active', type: 'true | false', optional: true },
      { name: 'page', type: 'integer', optional: true, default: 1 },
      { name: 'per_page', type: 'integer (max 100)', optional: true, default: 20 },
    ],
    requestBody: null,
    response: { status: 200, body: '{ items: ApiDonor[], total, page, per_page }' },
    errors: [{ code: 'UNAUTHORIZED', http: 401 }],
    notes: ['Defined in donorsService.ts — already implemented.'],
  },
  {
    id: 'donors.get',
    method: 'GET',
    path: '/api/v1/donors/:id',
    service: 'app_api',
    auth: 'staff',
    summary: 'Get donor with full donation history.',
    requestBody: null,
    response: {
      status: 200,
      body: 'ApiDonorDetail (ApiDonor + donations: [{ id, school_name, type, amount, state, registered_at }])',
    },
    errors: [{ code: 'NOT_FOUND', http: 404 }],
    notes: ['Defined in donorsService.ts — fully implemented including getDonor(id) returning ApiDonorDetail.'],
  },
  {
    id: 'donors.create',
    method: 'POST',
    path: '/api/v1/donors',
    service: 'app_api',
    auth: 'staff',
    summary: 'Create a donor.',
    requestBody: {
      full_name: 'string', email: 'string', type: 'individual | corporate',
      tax_id: 'string?', phone: 'string?', organization_name: 'string?', notes: 'string?',
    },
    response: { status: 201, body: 'ApiDonor' },
    errors: [
      { code: 'MISSING_FIELDS', http: 400 },
      { code: 'INVALID_TYPE', http: 400 },
      { code: 'CONFLICT', http: 409, reason: 'email or tax_id duplicate' },
    ],
    notes: ['Defined in donorsService.ts — already implemented.'],
  },
  {
    id: 'donors.update',
    method: 'PUT',
    path: '/api/v1/donors/:id',
    service: 'app_api',
    auth: 'staff',
    summary: 'Partial update of donor.',
    requestBody: 'Any subset of CreateDonorPayload',
    response: { status: 200, body: 'ApiDonor' },
    errors: [{ code: 'MISSING_FIELDS', http: 400 }, { code: 'NOT_FOUND', http: 404 }, { code: 'CONFLICT', http: 409 }],
    notes: ['Defined in donorsService.ts — already implemented.'],
  },
  {
    id: 'donors.deactivate',
    method: 'PATCH',
    path: '/api/v1/donors/:id/deactivate',
    service: 'app_api',
    auth: 'staff',
    summary: 'Soft-delete donor (is_active = false).',
    requestBody: null,
    response: { status: 200, body: { message: 'Donor deactivated' } },
    errors: [{ code: 'NOT_FOUND', http: 404 }],
    notes: ['Defined in donorsService.ts — already implemented.'],
  },

  // ── donations ────────────────────────────────────────────────────────────────
  {
    id: 'donations.list',
    method: 'GET',
    path: '/api/v1/donations',
    service: 'app_api',
    auth: 'staff',
    summary: 'Paginated list of donations.',
    queryParams: [
      { name: 'school_id', type: 'UUID', optional: true },
      { name: 'donor_id', type: 'UUID', optional: true },
      { name: 'state', type: 'registered|approved|in_delivery|delivered|completed|cancelled', optional: true },
      { name: 'type', type: 'monetary | material', optional: true },
      { name: 'page', type: 'integer', optional: true, default: 1 },
      { name: 'per_page', type: 'integer (max 100)', optional: true, default: 20 },
    ],
    requestBody: null,
    response: { status: 200, body: '{ items: ApiDonationSummary[], total, page, per_page }' },
    errors: [{ code: 'UNAUTHORIZED', http: 401 }],
    notes: ['Defined in donationsService.ts — fully implemented.'],
  },
  {
    id: 'donations.get',
    method: 'GET',
    path: '/api/v1/donations/:id',
    service: 'app_api',
    auth: 'staff',
    summary: 'Get full donation detail including delivery info and timeline.',
    requestBody: null,
    response: { status: 200, body: 'ApiDonationDetail (full detail with timeline object)' },
    errors: [{ code: 'NOT_FOUND', http: 404 }],
    notes: ['Defined in donationsService.ts — fully implemented.'],
  },
  {
    id: 'donations.create',
    method: 'POST',
    path: '/api/v1/donations',
    service: 'app_api',
    auth: 'staff',
    summary: 'Create a donation record.',
    requestBody: {
      donor_id: 'string (UUID)',
      school_id: 'string (UUID)',
      type: 'monetary | material',
      description: 'string?',
      amount: 'number (required for monetary)',
      estimated_value: 'number (required for material)',
      observations: 'string?',
      delivery: { mode: 'string?', shipping_address: 'string?', tracking_info: 'string?', notes: 'string?' },
    },
    response: { status: 201, body: 'ApiDonationDetail' },
    errors: [
      { code: 'MISSING_FIELDS', http: 400 },
      { code: 'MISSING_AMOUNT', http: 400, reason: 'amount missing for monetary' },
      { code: 'MISSING_ESTIMATED_VALUE', http: 400, reason: 'estimated_value missing for material' },
      { code: 'NOT_FOUND', http: 404, reason: 'donor_id or school_id not found' },
      { code: 'SCHOOL_ARCHIVED', http: 422 },
    ],
    notes: ['Defined in donationsService.ts — fully implemented.'],
  },
  {
    id: 'donations.update',
    method: 'PUT',
    path: '/api/v1/donations/:id',
    service: 'app_api',
    auth: 'staff',
    summary: 'Update description, observations, and/or delivery details. Does NOT change state.',
    requestBody: {
      description: 'string?',
      observations: 'string?',
      delivery: { mode: 'string?', shipping_address: 'string?', tracking_info: 'string?', notes: 'string?' },
    },
    response: { status: 200, body: 'ApiDonationDetail' },
    errors: [{ code: 'MISSING_FIELDS', http: 400 }, { code: 'NOT_FOUND', http: 404 }],
    notes: ['Defined in donationsService.ts — fully implemented.'],
  },
  {
    id: 'donations.updateState',
    method: 'PATCH',
    path: '/api/v1/donations/:id/state',
    service: 'app_api',
    auth: 'staff',
    summary: 'Advance or cancel donation workflow state.',
    stateMachine: {
      registered: ['approved', 'cancelled'],
      approved: ['in_delivery', 'cancelled'],
      in_delivery: ['delivered', 'cancelled'],
      delivered: ['completed'],
      completed: [],
      cancelled: [],
    },
    requestBody: { state: 'DonationState (required)', observations: 'string?' },
    response: {
      status: 200,
      body: '{ id: string, state: DonationState, approved_at: string | null }',
      note: 'Returns ONLY id, state, approved_at — NOT the full ApiDonationDetail.',
    },
    errors: [
      { code: 'MISSING_FIELDS', http: 400, reason: 'state absent from body' },
      { code: 'NOT_FOUND', http: 404 },
      { code: 'INVALID_STATE_TRANSITION', http: 422 },
    ],
    notes: [
      'Defined in donationsService.ts — fully implemented.',
      'Response is a minimal object — NOT ApiDonationDetail.',
    ],
  },

  // ── reports ──────────────────────────────────────────────────────────────────
  {
    id: 'reports.donationsBySchool',
    method: 'GET',
    path: '/api/v1/reports/donations-by-school',
    service: 'app_api',
    auth: 'admin',
    summary: 'Aggregated donation stats grouped by school.',
    queryParams: [{ name: 'school_id', type: 'UUID', optional: true, description: 'Omit for all schools' }],
    requestBody: null,
    response: {
      status: 200,
      body: 'DonationsBySchoolRow[]  — [{ school_id, school_name, total_monetary, total_material_value, total_donations, pending, completed }]',
    },
    errors: [{ code: 'FORBIDDEN', http: 403 }],
    notes: ['Defined in reportsService.ts — fully implemented.'],
  },
  {
    id: 'reports.donationsByDonor',
    method: 'GET',
    path: '/api/v1/reports/donations-by-donor',
    service: 'app_api',
    auth: 'admin',
    summary: 'Aggregated donation stats grouped by donor.',
    queryParams: [{ name: 'donor_id', type: 'UUID', optional: true }],
    requestBody: null,
    response: {
      status: 200,
      body: 'DonationsByDonorRow[]  — [{ donor_id, donor_name, total_donations, total_value, schools_supported }]',
    },
    errors: [{ code: 'FORBIDDEN', http: 403 }],
    notes: ['Defined in reportsService.ts — fully implemented.'],
  },
  {
    id: 'reports.pendingDeliveries',
    method: 'GET',
    path: '/api/v1/reports/pending-deliveries',
    service: 'app_api',
    auth: 'admin',
    summary: 'All donations currently in state approved or in_delivery.',
    requestBody: null,
    response: { status: 200, body: 'ApiDonationSummary[]' },
    errors: [{ code: 'FORBIDDEN', http: 403 }],
    notes: ['Defined in reportsService.ts — fully implemented.'],
  },
  {
    id: 'reports.completed',
    method: 'GET',
    path: '/api/v1/reports/completed',
    service: 'app_api',
    auth: 'admin',
    summary: 'All donations with state completed.',
    requestBody: null,
    response: { status: 200, body: 'ApiDonationSummary[]' },
    errors: [{ code: 'FORBIDDEN', http: 403 }],
    notes: ['Defined in reportsService.ts — fully implemented.'],
  },
  {
    id: 'reports.export',
    method: 'GET',
    path: '/api/v1/reports/export',
    service: 'app_api',
    auth: 'admin',
    summary: 'Export a report as CSV download.',
    queryParams: [
      {
        name: 'report',
        type: 'donations-by-school | donations-by-donor | pending-deliveries | completed',
        optional: false,
      },
    ],
    requestBody: null,
    response: {
      status: 200,
      contentType: 'text/csv',
      body: 'raw CSV string — use apiFetch + res.text(), NOT apiRequest',
    },
    errors: [{ code: 'INVALID_REPORT', http: 400 }],
    notes: [
      'Defined in reportsService.ts — fully implemented.',
      'Returns CSV, NOT JSON. Call apiFetch directly and use res.text().',
    ],
  },

  // ── xlsx ─────────────────────────────────────────────────────────────────────
  {
    id: 'xlsx.upload',
    method: 'POST',
    path: '/api/v1/xlsx/upload',
    service: 'app_api',
    auth: 'admin',
    summary: 'Upload an Excel file to sync into the database.',
    contentType: 'multipart/form-data',
    requestBody: 'FormData with field "file" containing the .xlsx file',
    response: { status: 200, body: '{ message: string, result: unknown }' },
    errors: [
      { code: 'FILE_REQUIRED', http: 400 },
      { code: 'UPLOAD_ERROR', http: 500 },
    ],
    notes: [
      'Defined in xlsxService.ts — fully implemented.',
      'Uses multipart/form-data. Use apiFetch directly — do NOT set Content-Type header (browser handles boundary).',
    ],
  },
  {
    id: 'xlsx.download',
    method: 'GET',
    path: '/api/v1/xlsx/download',
    service: 'app_api',
    auth: 'admin',
    summary: 'Download full database export as .xlsx file.',
    requestBody: null,
    response: {
      status: 200,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      body: 'Binary blob — use apiFetch + res.blob(), then URL.createObjectURL for download',
    },
    errors: [{ code: 'DOWNLOAD_ERROR', http: 500 }],
    notes: [
      'Defined in xlsxService.ts — fully implemented.',
      'Returns binary. Use apiFetch + res.blob(), NOT apiRequest.',
    ],
  },
];

const TYPESCRIPT_TYPES = {
  user: `
// ── Users ────────────────────────────────────────────────────────────────────

interface ApiUser {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'staff';
  is_active: boolean;
}

interface ApiUsersListResponse {
  items: ApiUser[];
  total: number;
}

interface CreateUserPayload {
  email: string;
  password: string;
  full_name: string;
  role: 'admin' | 'staff';
}

interface UpdateUserPayload {
  full_name?: string;
  password?: string;
}

interface UserFilters {
  role?: 'admin' | 'staff';
  is_active?: boolean;
}
`,

  school: `
// ── Schools — already in frontend/src/lib/schoolsService.ts ─────────────────

export interface ApiSchool {
  id: string;
  name: string;
  region: string;
  category: string;
  description: string | null;
  funding_goal: number;
  confirmed_value: number;
  progress_pct: number;
  status: 'active' | 'archived';
}

interface ApiSchoolsResponse {
  items: ApiSchool[];
  total: number;
  page: number;
  per_page: number;
}

export interface SchoolFilters {
  region?: string;
  category?: string;
  status?: 'active' | 'archived';
  page?: number;
  per_page?: number;
}

export interface SchoolPayload {
  name: string;
  region: string;
  category: string;
  description?: string;
  funding_goal: number;
}
`,

  donor: `
// ── Donors — base in frontend/src/lib/donorsService.ts ──────────────────────

interface ApiDonor {
  id: string;
  full_name: string;
  email: string;
  tax_id: string | null;
  phone: string | null;
  type: 'individual' | 'corporate';
  organization_name: string | null;
  notes: string | null;
  is_active: boolean;
  donation_count: number;
}

interface ApiDonorDetail extends ApiDonor {
  donations: Array<{
    id: string;
    school_name: string;
    type: 'monetary' | 'material';
    amount: number | null;
    state: DonationState;
    registered_at: string;
  }>;
}

interface ApiDonorsListResponse {
  items: ApiDonor[];
  total: number;
  page: number;
  per_page: number;
}

export interface DonorFilters {
  type?: 'individual' | 'corporate';
  name?: string;
  is_active?: boolean;
  page?: number;
  per_page?: number;
}

export interface CreateDonorPayload {
  full_name: string;
  email: string;
  type: 'individual' | 'corporate';
  tax_id?: string;
  phone?: string;
  organization_name?: string;
  notes?: string;
}
`,

  donation: `
// ── Donations ────────────────────────────────────────────────────────────────

export type DonationState =
  | 'registered'
  | 'approved'
  | 'in_delivery'
  | 'delivered'
  | 'completed'
  | 'cancelled';

export type DonationType = 'monetary' | 'material';

export interface ApiDonationSummary {
  id: string;
  donor: { id: string; full_name: string };
  school: { id: string; name: string };
  type: DonationType;
  amount: number | null;
  estimated_value: number | null;
  state: DonationState;
  delivery_mode: string | null;
  registered_at: string;
}

export interface ApiDonationDetail {
  id: string;
  donor: { id: string; full_name: string; type: 'individual' | 'corporate' };
  school: { id: string; name: string; region: string };
  type: DonationType;
  description: string | null;
  amount: number | null;
  estimated_value: number | null;
  state: DonationState;
  observations: string | null;
  delivery: {
    mode: string | null;
    shipping_address: string | null;
    tracking_info: string | null;
    notes: string | null;
  };
  timeline: {
    registered_at: string | null;
    approved_at: string | null;
    in_delivery_at: string | null;
    delivered_at: string | null;
    completed_at: string | null;
    cancelled_at: string | null;
  };
}

interface ApiDonationsListResponse {
  items: ApiDonationSummary[];
  total: number;
  page: number;
  per_page: number;
}

export interface DonationFilters {
  school_id?: string;
  donor_id?: string;
  state?: DonationState;
  type?: DonationType;
  page?: number;
  per_page?: number;
}

export interface CreateDonationPayload {
  donor_id: string;
  school_id: string;
  type: DonationType;
  description?: string;
  amount?: number;
  estimated_value?: number;
  observations?: string;
  delivery: {
    mode?: string;
    shipping_address?: string;
    tracking_info?: string;
    notes?: string;
  };
}

export interface UpdateDonationPayload {
  description?: string;
  observations?: string;
  delivery?: {
    mode?: string;
    shipping_address?: string;
    tracking_info?: string;
    notes?: string;
  };
}

export interface UpdateDonationStatePayload {
  state: DonationState;
  observations?: string;
}

export interface DonationStateUpdateResponse {
  id: string;
  state: DonationState;
  approved_at: string | null;
}
`,

  report: `
// ── Reports ──────────────────────────────────────────────────────────────────

export interface DonationsBySchoolRow {
  school_id: string;
  school_name: string;
  total_monetary: number;
  total_material_value: number;
  total_donations: number;
  pending: number;
  completed: number;
}

export interface DonationsByDonorRow {
  donor_id: string;
  donor_name: string;
  total_donations: number;
  total_value: number;
  schools_supported: number;
}

export type ReportType =
  | 'donations-by-school'
  | 'donations-by-donor'
  | 'pending-deliveries'
  | 'completed';

export interface ReportFilters {
  school_id?: string;  // for donations-by-school
  donor_id?: string;   // for donations-by-donor
}
`,

  xlsx: `
// ── XLSX ─────────────────────────────────────────────────────────────────────

export interface XlsxUploadResult {
  message: string;
  result: unknown;
}
`,

  auth: `
// ── Auth — in frontend/src/lib/authService.ts ────────────────────────────────

export interface AuthUser {
  id: string;
  firstname: string;
  lastname: string;
  email: string;
  role: 'admin' | 'staff';
  created_at: string;
}

interface LoginResponse {
  accessToken: string;   // camelCase
  refreshToken: string;  // camelCase
}

interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

interface RegisterPayload {
  email: string;
  password: string;
  firstname: string;
  lastname: string;
}
`,
};

const IMPLEMENTATION_STATUS = {
  implemented: [
    {
      file: 'frontend/src/lib/apiClient.ts',
      exports: ['AUTH_BASE', 'APP_BASE', 'getAccessToken', 'getRefreshToken', 'setTokens', 'clearTokens', 'ApiError', 'apiFetch', 'apiRequest'],
      description: 'Base HTTP client with token management and auto-refresh on 401.',
    },
    {
      file: 'frontend/src/lib/authService.ts',
      exports: ['AuthUser', 'RegisterPayload', 'register', 'login', 'getMe', 'logout', 'isAuthenticated'],
      description: 'All auth endpoints fully implemented: register, login, logout, me.',
    },
    {
      file: 'frontend/src/lib/schoolsService.ts',
      exports: ['ApiSchool', 'SchoolFilters', 'SchoolPayload', 'fetchSchools', 'getSchool', 'createSchool', 'updateSchool', 'archiveSchool'],
      description: 'All school endpoints fully implemented including GET by id.',
    },
    {
      file: 'frontend/src/lib/donorsService.ts',
      exports: ['ApiDonorDetail', 'DonorFilters', 'CreateDonorPayload', 'fetchDonors', 'getDonor', 'createDonor', 'updateDonor', 'deactivateDonor'],
      description: 'All donor endpoints fully implemented including GET /donors/:id detail.',
    },
    {
      file: 'frontend/src/lib/donationsService.ts',
      exports: ['DonationState', 'DonationType', 'ApiDonationSummary', 'ApiDonationDetail', 'DonationFilters', 'CreateDonationPayload', 'UpdateDonationPayload', 'UpdateDonationStatePayload', 'DonationStateUpdateResponse', 'fetchDonations', 'getDonation', 'createDonation', 'updateDonation', 'updateDonationState'],
      description: 'All donation endpoints fully implemented including state machine transitions.',
    },
    {
      file: 'frontend/src/lib/usersService.ts',
      exports: ['ApiUser', 'UserFilters', 'CreateUserPayload', 'UpdateUserPayload', 'fetchUsers', 'getUser', 'createUser', 'updateUser', 'deactivateUser'],
      description: 'All user endpoints fully implemented (admin-only except GET/:id and PUT/:id for own profile).',
    },
    {
      file: 'frontend/src/lib/reportsService.ts',
      exports: ['DonationsBySchoolRow', 'DonationsByDonorRow', 'ReportType', 'donationsBySchool', 'donationsByDonor', 'pendingDeliveries', 'completedDonations', 'exportReport'],
      description: 'All report endpoints fully implemented. exportReport returns raw CSV string via apiFetch + res.text().',
    },
    {
      file: 'frontend/src/lib/xlsxService.ts',
      exports: ['XlsxUploadResult', 'uploadXlsx', 'downloadXlsx'],
      description: 'Excel upload (multipart/form-data via FormData) and download (binary blob) fully implemented.',
    },
  ],
  missing: [],
  partiallyImplemented: [],
};

const FRONTEND_COMPONENT_STATUS = [
  // ── Page components ───────────────────────────────────────────────────────
  {
    component: 'frontend/src/app/login/page.tsx',
    serviceIntegrated: true,
    servicesUsed: ['authService.ts → login()'],
    mockDataFiles: [],
    notes: 'Fully wired to real auth service.',
  },
  {
    component: 'frontend/src/components/escuelas/EscuelasPage.tsx',
    serviceIntegrated: true,
    servicesUsed: ['schoolsService.ts → fetchSchools(), createSchool(), updateSchool(), archiveSchool()'],
    mockDataFiles: [],
    notes: 'Fully wired to real schools service.',
  },
  {
    component: 'frontend/src/components/donantes/DonantesPage.tsx',
    serviceIntegrated: true,
    servicesUsed: ['donorsService.ts → fetchDonors(), createDonor(), updateDonor(), deactivateDonor()'],
    mockDataFiles: [],
    notes: 'Fully wired to real donors service.',
  },
  {
    component: 'frontend/src/components/donaciones/DonacionesPage.tsx',
    serviceIntegrated: false,
    servicesUsed: [],
    mockDataFiles: ['donacionesSampleData.ts (mockDonations)'],
    notes: '⚠️ Still using mock data. Must be replaced with donationsService.ts calls: fetchDonations(), createDonation(), updateDonation(), updateDonationState().',
  },
  {
    component: 'frontend/src/components/main/RecentDonations.tsx',
    serviceIntegrated: false,
    servicesUsed: [],
    mockDataFiles: ['sampleData.ts (mockDonations)'],
    notes: '⚠️ Dashboard widget still using mock data. Should use donationsService.ts → fetchDonations() for a live summary.',
  },
  {
    component: 'frontend/src/components/main/RecentSchools.tsx',
    serviceIntegrated: false,
    servicesUsed: [],
    mockDataFiles: ['sampleData.ts (mockSchools)'],
    notes: '⚠️ Dashboard widget still using mock data. Should use schoolsService.ts → fetchSchools() for a live summary.',
  },
  {
    component: 'frontend/src/components/main/StatsCards.tsx',
    serviceIntegrated: false,
    servicesUsed: [],
    mockDataFiles: [],
    notes: '⚠️ Stats are hardcoded. Should be driven by reportsService.ts data (donationsBySchool, donationsByDonor) or dedicated summary endpoints.',
  },
  {
    component: 'frontend/src/components/preferencias/PreferenciasPage.tsx',
    serviceIntegrated: false,
    servicesUsed: [],
    mockDataFiles: [],
    notes: '⚠️ Settings form is not wired to any service. Profile updates should call usersService.ts → updateUser(); password changes also via updateUser().',
  },
  // ── Layout / shell components (no service needed) ─────────────────────────
  {
    component: 'frontend/src/components/AdminSidebar.tsx',
    serviceIntegrated: null,
    servicesUsed: [],
    mockDataFiles: [],
    notes: 'Navigation shell — no API service required.',
  },
  {
    component: 'frontend/src/components/Header.tsx',
    serviceIntegrated: null,
    servicesUsed: [],
    mockDataFiles: [],
    notes: 'Layout header — no API service required.',
  },
  {
    component: 'frontend/src/components/Footer.tsx',
    serviceIntegrated: null,
    servicesUsed: [],
    mockDataFiles: [],
    notes: 'Layout footer — no API service required.',
  },
];

const SERVICE_PATTERN = `
// ── Pattern for a new service file ──────────────────────────────────────────
// File: frontend/src/lib/<resource>Service.ts

import { APP_BASE, apiRequest, apiFetch } from './apiClient';

// 1. Backend response interfaces (prefix with Api)
interface ApiResource {
  id: string;
  // ... fields matching the backend JSON response exactly
}

interface ApiResourceListResponse {
  items: ApiResource[];
  total: number;
  page: number;
  per_page: number;
}

// 2. Exported payload / filter types
export interface ResourceFilters {
  page?: number;
  per_page?: number;
  // ... optional query params
}

export interface CreateResourcePayload {
  // ... required + optional fields
}

// 3. Optional adapter (only when backend and frontend field names differ)
function toFrontend(r: ApiResource): FrontendResource {
  return { /* map fields */ };
}

// 4. Exported service functions
export async function fetchResources(filters: ResourceFilters = {}): Promise<{
  items: ApiResource[];
  total: number;
  page: number;
}> {
  const params = new URLSearchParams();
  if (filters.page)     params.set('page',     String(filters.page));
  if (filters.per_page) params.set('per_page', String(filters.per_page));

  const query = params.toString();
  const data = await apiRequest<ApiResourceListResponse>(
    \`\${APP_BASE}/resources\${query ? \`?\${query}\` : ''}\`
  );
  return { items: data.items, total: data.total, page: data.page };
}

export async function getResource(id: string): Promise<ApiResource> {
  return apiRequest<ApiResource>(\`\${APP_BASE}/resources/\${id}\`);
}

export async function createResource(payload: CreateResourcePayload): Promise<ApiResource> {
  return apiRequest<ApiResource>(\`\${APP_BASE}/resources\`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateResource(id: string, payload: Partial<CreateResourcePayload>): Promise<ApiResource> {
  return apiRequest<ApiResource>(\`\${APP_BASE}/resources/\${id}\`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

// For multipart/form-data (xlsx upload):
export async function uploadFile(file: File): Promise<XlsxUploadResult> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await apiFetch(\`\${APP_BASE}/xlsx/upload\`, {
    method: 'POST',
    body: formData,
    // Do NOT set Content-Type — browser sets multipart boundary automatically
  });
  if (!res.ok) throw new Error('Upload failed');
  return res.json();
}

// For CSV export:
export async function exportReport(report: ReportType): Promise<string> {
  const res = await apiFetch(\`\${APP_BASE}/reports/export?report=\${report}\`);
  if (!res.ok) throw new Error('Export failed');
  return res.text(); // NOT res.json()
}

// For binary blob download:
export async function downloadXlsx(): Promise<Blob> {
  const res = await apiFetch(\`\${APP_BASE}/xlsx/download\`);
  if (!res.ok) throw new Error('Download failed');
  return res.blob();
}
`;

// ── Tool handlers ─────────────────────────────────────────────────────────────

const tools = {
  list_endpoints(args) {
    const { service, auth_required, not_implemented_only } = args ?? {};
    let results = ENDPOINTS;

    if (service)             results = results.filter(e => e.service === service);
    if (auth_required)       results = results.filter(e => e.auth !== 'none');
    if (not_implemented_only) results = results.filter(e => e.notes?.some(n => n.includes('NOT yet implemented')));

    return results.map(e => ({
      id:          e.id,
      method:      e.method,
      path:        e.path,
      service:     e.service,
      auth:        e.auth,
      summary:     e.summary,
      implemented: !e.notes?.some(n => n.includes('NOT yet implemented')),
    }));
  },

  get_endpoint_details(args) {
    const { endpoint_id } = args ?? {};
    const ep = ENDPOINTS.find(e => e.id === endpoint_id);
    if (!ep) return { error: `Endpoint '${endpoint_id}' not found. Use list_endpoints to see valid IDs.` };
    return ep;
  },

  get_typescript_types(args) {
    const { resource } = args ?? {};
    const types = TYPESCRIPT_TYPES[resource];
    if (!types) {
      return {
        error: `Unknown resource '${resource}'.`,
        available: Object.keys(TYPESCRIPT_TYPES),
      };
    }
    return { resource, typescript: types.trim() };
  },

  get_frontend_component_status(args) {
    const { integrated_only, not_integrated_only } = args ?? {};
    let results = FRONTEND_COMPONENT_STATUS;
    if (integrated_only)     results = results.filter(c => c.serviceIntegrated === true);
    if (not_integrated_only) results = results.filter(c => c.serviceIntegrated === false);
    return results;
  },

  get_implementation_status() {
    return IMPLEMENTATION_STATUS;
  },

  get_service_pattern() {
    return {
      description: 'Template and examples for creating a new service file in frontend/src/lib/',
      pattern: SERVICE_PATTERN.trim(),
      key_rules: [
        'Import APP_BASE + apiRequest from ./apiClient',
        'Use apiFetch (not apiRequest) for multipart, CSV, and binary responses',
        'For multipart upload: use FormData, do NOT manually set Content-Type header',
        'For CSV export: call res.text() not res.json()',
        'For binary download: call res.blob(), then URL.createObjectURL for browser download',
        'apiRequest throws ApiError on non-2xx — do not wrap in try/catch unless rethrowing',
        'Prefix backend interface names with Api (e.g. ApiDonation, ApiUser)',
        'Export all payload types, filter types, and resource interfaces',
      ],
    };
  },
};

// ── MCP server ────────────────────────────────────────────────────────────────

const server = new Server(
  { name: 'impulsaedu-api', version: '1.1.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'list_endpoints',
      description: 'List all ImpulsaEdu API endpoints with method, path, auth, and implementation status.',
      inputSchema: {
        type: 'object',
        properties: {
          service: {
            type: 'string',
            enum: ['auth', 'app_api'],
            description: 'Filter by service.',
          },
          auth_required: {
            type: 'boolean',
            description: 'If true, only return endpoints that require authentication.',
          },
          not_implemented_only: {
            type: 'boolean',
            description: 'If true, only return endpoints not yet implemented in the frontend.',
          },
        },
      },
    },
    {
      name: 'get_endpoint_details',
      description: 'Get the full spec for a single endpoint — request body, response shape, error codes, and implementation notes.',
      inputSchema: {
        type: 'object',
        properties: {
          endpoint_id: {
            type: 'string',
            description: 'The endpoint ID (e.g. "donations.create", "auth.login"). Use list_endpoints to find IDs.',
          },
        },
        required: ['endpoint_id'],
      },
    },
    {
      name: 'get_typescript_types',
      description: 'Get TypeScript interface definitions for a resource.',
      inputSchema: {
        type: 'object',
        properties: {
          resource: {
            type: 'string',
            enum: ['auth', 'user', 'school', 'donor', 'donation', 'report', 'xlsx'],
            description: 'The resource to get TypeScript types for.',
          },
        },
        required: ['resource'],
      },
    },
    {
      name: 'get_frontend_component_status',
      description: 'Get the integration status of each frontend UI component — which ones are wired to real API services vs still using mock/sample data.',
      inputSchema: {
        type: 'object',
        properties: {
          integrated_only: {
            type: 'boolean',
            description: 'If true, return only components that are already wired to a real service.',
          },
          not_integrated_only: {
            type: 'boolean',
            description: 'If true, return only components that still use mock data and need service integration.',
          },
        },
      },
    },
    {
      name: 'get_implementation_status',
      description: 'Get a summary of what is already implemented in frontend/src/lib/ vs what still needs to be built.',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'get_service_pattern',
      description: 'Get the service file template and key rules followed by existing ImpulsaEdu service files.',
      inputSchema: { type: 'object', properties: {} },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const handler = tools[name];

  if (!handler) {
    return {
      content: [{ type: 'text', text: JSON.stringify({ error: `Unknown tool: ${name}` }) }],
      isError: true,
    };
  }

  try {
    const result = handler(args);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  } catch (err) {
    return {
      content: [{ type: 'text', text: JSON.stringify({ error: err.message }) }],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
