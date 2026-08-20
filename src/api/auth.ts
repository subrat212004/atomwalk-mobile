import { api } from "./client";
import type { Envelope, LoginResponse } from "./types";

/**
 * POST /api/v1/auth/login/patient/ — {mobile, password} accepts mobile, AWPID, or email.
 * Response is wrapped in the {success,message,data} envelope — confirmed against
 * PatientLoginView's `return success(data=_make_tokens(payload), ...)` in
 * apps/auth_app/views.py:290. data contains only {access, refresh}.
 */
export async function loginPatient(mobile: string, password: string) {
  const res = await api.post<Envelope<LoginResponse>>("/auth/login/patient/", { mobile, password });
  return res.data.data;
}

export async function logout(refresh: string | null) {
  await api.post("/auth/logout/", refresh ? { refresh } : {});
}

/** POST /api/v1/portal/register/request-otp/ — {mobile, email} */
export async function registerRequestOtp(mobile: string, email: string) {
  const res = await api.post<Envelope<{ debug_otp?: string }>>("/portal/register/request-otp/", { mobile, email });
  return res.data;
}

/** POST /api/v1/portal/register/verify-otp/ — {mobile, otp} */
export async function registerVerifyOtp(mobile: string, otp: string) {
  const res = await api.post<Envelope<null>>("/portal/register/verify-otp/", { mobile, otp });
  return res.data;
}

/** POST /api/v1/portal/register/ — {full_name, mobile, password, email?, gender?, date_of_birth?} */
export async function registerAccount(payload: {
  full_name: string;
  mobile: string;
  password: string;
  email?: string;
  gender?: string;
  date_of_birth?: string;
}) {
  const res = await api.post<Envelope<{ awpid: string; mobile: string }>>("/portal/register/", payload);
  return res.data;
}

/** POST /api/v1/portal/forgot-password/request-otp/ — {mobile} (code emailed to the account's email) */
export async function forgotPasswordRequestOtp(mobile: string) {
  const res = await api.post<Envelope<{ debug_otp?: string }>>("/portal/forgot-password/request-otp/", { mobile });
  return res.data;
}

export async function forgotPasswordVerifyOtp(mobile: string, otp: string) {
  const res = await api.post<Envelope<null>>("/portal/forgot-password/verify-otp/", { mobile, otp });
  return res.data;
}

/**
 * POST /api/v1/portal/forgot-password/reset/ — {mobile, new_password, confirm_password}
 * Confirmed against PortalForgotPasswordResetView (apps/patients/portal_views.py:2117) —
 * the backend does its own new_password === confirm_password check server-side,
 * so both fields are required even though the client already validated the match.
 */
export async function forgotPasswordReset(mobile: string, new_password: string, confirm_password: string) {
  const res = await api.post<Envelope<null>>("/portal/forgot-password/reset/", { mobile, new_password, confirm_password });
  return res.data;
}
