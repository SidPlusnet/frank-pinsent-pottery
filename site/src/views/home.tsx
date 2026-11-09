import type { FC } from 'hono/jsx'
import { Layout } from './components'

/** Homepage gallery. size: 'big' = 2x2, 'tall' = 1x2, 'wide' = 2x1, otherwise one square. */
type Tile = { src: string; alt: string; size?: 'big' | 'tall' | 'wide'; pos?: string }

const GALLERY: Tile[] = [
  { src: '/img/new/n15.webp', alt: 'Close-up of black and white marbled slip', size: 'big' },
  { src: '/img/new/n17.webp', alt: 'Slip-trailed mug' },
  { src: '/img/new/n04.webp', alt: 'Small flask with trailed slip' },
  { src: '/img/new/n28.jpg', alt: 'Striped teapot' },
  { src: '/img/new/n13.webp', alt: 'Little slipware animals' },
  { src: '/img/frank/window.webp', alt: 'Frank working by the workshop window', size: 'tall', pos: '50% 40%' },
  { src: '/img/new/n11.webp', alt: 'Striped plate' },
  { src: '/img/new/n24.webp', alt: 'Lidded pots with star-pattern lids' },
  { src: '/img/new/n03.webp', alt: 'Detail of a cream bottle with trailed decoration' },
  { src: '/img/new/n18.webp', alt: 'Close-up of a mug handle and rim' },
  { src: '/img/frank/throwing.webp', alt: 'Frank throwing a pot on the wheel', size: 'wide', pos: '50% 30%' },
  { src: '/img/new/n07.webp', alt: 'Round bottle in black and cream slip' },
  { src: '/img/new/n34.jpg', alt: 'Two small round vases' },
  { src: '/img/new/n22.webp', alt: 'Striped lidded pots' },
  { src: '/img/new/n06.webp', alt: 'Bottle with a little handle, red and cream slip' },
  { src: '/img/new/n19.webp', alt: 'Brown and cream mug' },
  { src: '/img/new/n12.webp', alt: 'A small slipware dog' },
  { src: '/img/new/n08.webp', alt: 'Two trailed plates' },
  { src: '/img/new/n01.webp', alt: 'Lidded jar with marbled slip' },
]

export const HomePage: FC = () => (
  <Layout active="home">
    <section class="hero" aria-label="Three slip-trailed vases">
      <img src="/img/pots/2.jpg" alt="Three slip-trailed vases on linen" width="1920" height="1280" fetchpriority="high" />
    </section>
    <section class="gallery" aria-label="Pots">
      {GALLERY.map((t, i) => (
        <figure class={`tile ${t.size ? `tile--${t.size}` : ''}`}>
          <img
            src={t.src}
            alt={t.alt}
            loading={i < 4 ? 'eager' : 'lazy'}
            style={t.pos ? `object-position:${t.pos}` : undefined}
          />
        </figure>
      ))}
    </section>
    <p class="home-cta">
      <a class="btn" href="/shop">
        Visit the shop
      </a>
    </p>
  </Layout>
)
