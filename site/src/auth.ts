import type { MiddlewareHandler } from 'hono'
import { Jwt } from 'hono/utils/jwt'
import type { Env } from './types'

export type AdminVars = { adminEmail: string }

/**
 * Protects /admin. In production, Cloudflare Access sits in front of /admin and signs Frank in
 * with a one-time email code; it then adds a signed JWT header to every request, which we verify
 * here (belt and braces, in case the Access policy is ever misconfigured).
 *
 * Locally there is no Access, so `DEV_ADMIN_BYPASS=true` in .dev.vars lets you in,
 * but only when the request is to localhost.
 *
 * Fails closed: if Access isn't configured, admin is locked.
 */
export const requireAdmin: MiddlewareHandler<{ Bindings: Env; Variables: AdminVars }> = async (c, next) => {
  c.header('Cache-Control', 'no-store')
  c.header('X-Robots-Tag', 'noindex, nofollow')

  const host = new URL(c.req.url).hostname
  const isLocal = host === 'localhost' || host === '127.0.0.1'
  if (c.env.DEV_ADMIN_BYPASS === 'true' && isLocal) {
    c.set('adminEmail', 'local dev')
    return next()
  }

  const team = c.env.ACCESS_TEAM_DOMAIN // e.g. "frankpinsent.cloudflareaccess.com"
  const aud = c.env.ACCESS_AUD // the Access application's "Application Audience (AUD) Tag"
  if (!team || !aud) return c.text('Admin is locked: Cloudflare Access is not set up yet.', 403)

  const token = c.req.header('cf-access-jwt-assertion')
  if (!token) return c.text('Forbidden', 403)
  try {
    const payload = await Jwt.verifyWithJwks(token, {
      jwks_uri: `https://${team}/cdn-cgi/access/certs`,
      allowedAlgorithms: ['RS256'],
      verification: { aud, iss: `https://${team}` },
    })
    c.set('adminEmail', String(payload.email ?? ''))
  } catch {
    return c.text('Forbidden', 403)
  }
  return next()
}
