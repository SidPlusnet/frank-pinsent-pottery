-- Frank Pinsent Pottery: initial schema

-- Pots for sale. kind = 'range' (always available, made in batches) or 'oneoff' (single piece).
CREATE TABLE products (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  slug        TEXT NOT NULL UNIQUE,
  title       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price_pence INTEGER NOT NULL CHECK (price_pence >= 0),
  stock       INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  kind        TEXT NOT NULL DEFAULT 'range' CHECK (kind IN ('range', 'oneoff')),
  published   INTEGER NOT NULL DEFAULT 1,
  sort        INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE product_images (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url        TEXT NOT NULL,          -- '/img/...' for bundled files, '/media/<key>' for uploads in R2
  alt        TEXT NOT NULL DEFAULT '',
  sort       INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_product_images_product ON product_images(product_id, sort);

-- Markets and fairs Frank will be at.
CREATE TABLE events (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  title     TEXT NOT NULL,
  location  TEXT NOT NULL DEFAULT '',
  starts_on TEXT NOT NULL,           -- YYYY-MM-DD
  ends_on   TEXT,                    -- YYYY-MM-DD, optional
  link      TEXT,
  notes     TEXT NOT NULL DEFAULT '',
  published INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX idx_events_starts ON events(starts_on);

-- Commission enquiries sent from the website form.
CREATE TABLE commission_requests (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  idea       TEXT NOT NULL,
  budget     TEXT NOT NULL DEFAULT '',
  timescale  TEXT NOT NULL DEFAULT '',
  status     TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'replied', 'done', 'declined')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Orders. Created as 'pending' when the customer goes to checkout,
-- marked 'paid' by the Square webhook (stage 3).
CREATE TABLE orders (
  id                TEXT PRIMARY KEY,  -- our own random id, also used as Square idempotency key
  square_order_id   TEXT UNIQUE,
  square_link_id    TEXT,
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'shipped', 'cancelled')),
  customer_name     TEXT,
  customer_email    TEXT,
  shipping_address  TEXT,              -- JSON
  items_json        TEXT NOT NULL,     -- JSON snapshot: [{id, title, price_pence, qty}]
  subtotal_pence    INTEGER NOT NULL,
  shipping_pence    INTEGER NOT NULL,
  total_pence       INTEGER NOT NULL,
  created_at        TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  paid_at           TEXT,
  shipped_at        TEXT
);
CREATE INDEX idx_orders_status ON orders(status, created_at);
