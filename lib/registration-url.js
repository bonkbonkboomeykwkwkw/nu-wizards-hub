const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://nu-wizards-hub.vercel.app";

export function getRegistrationVerificationUrl(registrationId) {
  const url = new URL("/check-registration", SITE_URL);
  url.searchParams.set("registrationId", registrationId);
  return url.toString();
}
