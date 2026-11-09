export interface Env {
  DB: D1Database
  MEDIA: R2Bucket
  ASSETS: Fetcher
  SITE_NAME: string
  SHIPPING_PENCE: string
  // Admin login (Cloudflare Access)
  ACCESS_TEAM_DOMAIN?: string
  ACCESS_AUD?: string
  DEV_ADMIN_BYPASS?: string
  // Stage 3 secrets
  SQUARE_ENV?: 'sandbox' | 'production'
  SQUARE_ACCESS_TOKEN?: string
  SQUARE_LOCATION_ID?: string
  SQUARE_WEBHOOK_SIGNATURE_KEY?: string
  /** Exactly the notification URL entered in Square's webhook settings (used to check signatures). */
  SQUARE_WEBHOOK_URL?: string
  RESEND_API_KEY?: string
  ORDER_NOTIFY_EMAIL?: string
  EMAIL_FROM?: string
}

export interface Product {
  id: number
  slug: string
  title: string
  description: string
  price_pence: number
  stock: number
  kind: 'range' | 'oneoff'
  published: number
  sort: number
  image_url: string | null
  image_alt: string | null
}

export interface ProductImage {
  id: number
  url: string
  alt: string
  sort: number
}

export interface MarketEvent {
  id: number
  title: string
  location: string
  starts_on: string
  ends_on: string | null
  link: string | null
  notes: string
}
