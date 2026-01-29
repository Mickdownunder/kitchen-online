// Auth Package
// Handles customer authentication via project access codes

export { requireCustomerSession, type CustomerSession } from './requireCustomerSession'
export { loginWithAccessCode, type LoginResult } from './loginWithAccessCode'
export { createSupabaseClient, createSupabaseAdmin } from './supabase'
