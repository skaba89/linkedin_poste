/**
 * Centralized LinkedIn API configuration.
 * All LinkedIn API calls MUST use these constants to avoid version mismatch errors.
 */

export const LINKEDIN_API_VERSION = '202510';
export const LINKEDIN_BASE_URL = 'https://api.linkedin.com/rest';

/**
 * Returns standard headers for LinkedIn REST API calls.
 * Always include the version and protocol headers.
 */
export function linkedinHeaders(accessToken: string): Record<string, string> {
  return {
    'Authorization': `Bearer ${accessToken}`,
    'LinkedIn-Version': LINKEDIN_API_VERSION,
    'Content-Type': 'application/json',
    'X-Restli-Protocol-Version': '2.0.0',
  };
}
