// Basket: stored in the visitor's browser as [{id, qty}]. Prices and stock always come
// fresh from the server, and the server re-checks everything again at checkout.
;(function () {
  'use strict'
  var KEY = 'fp-basket'

  function read() {
    try {
      var v = JSON.parse(localStorage.getItem(KEY) || '[]')
      return Array.isArray(v) ? v.filter(function (l) { return l && l.id > 0 && l.qty > 0 }) : []
    } catch (e) {
      return []
    }
  }
  function write(lines) {
    try { localStorage.setItem(KEY, JSON.stringify(lines)) } catch (e) { /* private mode etc. */ }
    updateCount()
  }
  function count(lines) {
    return lines.reduce(function (n, l) { return n + l.qty }, 0)
  }
  function updateCount() {
    var n = count(read())
    document.querySelectorAll('[data-basket-count]').forEach(function (el) {
      el.textContent = String(n)
      if (n === 0) el.setAttribute('data-empty', '')
      else el.removeAttribute('data-empty')
    })
  }
  function money(p) {
    return '£' + (p % 100 === 0 ? (p / 100).toFixed(0) : (p / 100).toFixed(2))
  }
  // Tiny element helper that never uses innerHTML.
  function h(tag, attrs, kids) {
    var el = document.createElement(tag)
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'text') el.textContent = attrs[k]
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), attrs[k])
      else if (attrs[k] !== false && attrs[k] != null) el.setAttribute(k, attrs[k] === true ? '' : attrs[k])
    })
    ;(kids || []).forEach(function (c) { if (c) el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c) })
    return el
  }

  // ----- "Add to basket" on product pages -----
  function initAddForms() {
    document.querySelectorAll('[data-add-to-basket]').forEach(function (form) {
      form.addEventListener('submit', function (ev) {
        ev.preventDefault()
        var id = Number(form.getAttribute('data-id'))
        var max = Number(form.getAttribute('data-max')) || 1
        var sel = form.querySelector('select[name=qty]')
        var qty = sel ? Number(sel.value) : 1
        var lines = read()
        var line = lines.find(function (l) { return l.id === id })
        var msg = form.querySelector('[data-add-msg]')
        if (line) {
          if (line.qty >= max) {
            if (msg) msg.replaceChildren('That’s all I have in stock, and it’s already in ', h('a', { href: '/basket', text: 'your basket' }), '.')
            return
          }
          line.qty = Math.min(max, line.qty + qty)
        } else {
          lines.push({ id: id, qty: Math.min(max, qty) })
        }
        write(lines)
        if (msg) msg.replaceChildren('Added! ', h('a', { href: '/basket', text: 'View your basket' }))
      })
    })
  }

  // ----- Product photo gallery -----
  function initGallery() {
    var main = document.querySelector('[data-gallery-main]')
    if (!main) return
    document.querySelectorAll('[data-gallery-thumb]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        main.src = btn.getAttribute('data-gallery-thumb')
        main.alt = btn.getAttribute('data-alt') || ''
        document.querySelectorAll('[data-gallery-thumb]').forEach(function (b) { b.classList.remove('is-active') })
        btn.classList.add('is-active')
      })
    })
  }

  // ----- Basket page -----
  function initBasketPage() {
    var root = document.getElementById('basket-root')
    if (!root) return
    var products = {}
    var shipping = Number(root.getAttribute('data-shipping')) || 500

    function render(message) {
      var lines = read().filter(function (l) { return products[l.id] })
      root.replaceChildren()
      if (message) root.appendChild(h('p', { class: 'notice', role: 'status', text: message }))
      if (lines.length === 0) {
        root.appendChild(h('p', { class: 'empty', text: 'Your basket is empty.' }))
        root.appendChild(h('p', null, [h('a', { class: 'btn', href: '/shop', text: 'Go to the shop' })]))
        return
      }
      var subtotal = 0
      var list = h('ul', { class: 'basket-lines' })
      lines.forEach(function (l) {
        var p = products[l.id]
        var lineTotal = p.price_pence * l.qty
        subtotal += lineTotal
        list.appendChild(h('li', { class: 'line' }, [
          p.image_url ? h('img', { src: p.image_url, alt: '' }) : h('div', { class: 'card__noimg', style: 'width:96px;height:96px;border-radius:14px' }),
          h('div', null, [
            h('a', { class: 'line__title', href: '/pot/' + encodeURIComponent(p.slug), text: p.title }),
            h('div', { class: 'line__meta', text: money(p.price_pence) + (p.kind === 'oneoff' ? ' · one of a kind' : ' each') }),
            h('div', { class: 'line__controls' }, [
              h('button', { class: 'qty-btn', type: 'button', 'aria-label': 'One fewer', text: '−', disabled: l.qty <= 1, onclick: function () { change(l.id, -1) } }),
              h('span', { 'aria-live': 'polite', text: String(l.qty) }),
              h('button', { class: 'qty-btn', type: 'button', 'aria-label': 'One more', text: '+', disabled: l.qty >= Math.min(p.stock, 10), onclick: function () { change(l.id, 1) } }),
              h('button', { class: 'remove', type: 'button', text: 'Remove', onclick: function () { remove(l.id) } }),
            ]),
          ]),
          h('div', { class: 'line__price', text: money(lineTotal) }),
        ]))
      })
      root.appendChild(list)
      root.appendChild(h('div', { class: 'totals' }, [
        h('div', null, [h('span', { text: 'Pots' }), h('span', { text: money(subtotal) })]),
        h('div', null, [h('span', { text: 'UK delivery' }), h('span', { text: money(shipping) })]),
        h('div', { class: 'grand' }, [h('span', { text: 'Total' }), h('span', { text: money(subtotal + shipping) })]),
      ]))
      var status = h('p', { class: 'notice', role: 'alert', hidden: true })
      var btn = h('button', { class: 'btn btn--clay', type: 'button', text: 'Checkout securely' })
      btn.addEventListener('click', function () { checkout(btn, status) })
      root.appendChild(h('div', { class: 'checkout' }, [
        btn,
        h('p', { class: 'secure', text: '🔒 You’ll pay on Square’s secure checkout. Card, Apple Pay and Google Pay accepted. UK addresses only.' }),
        status,
      ]))
    }

    function change(id, delta) {
      var lines = read()
      var l = lines.find(function (x) { return x.id === id })
      if (!l) return
      var max = Math.min(products[id].stock, 10)
      l.qty = Math.max(1, Math.min(max, l.qty + delta))
      write(lines)
      render()
    }
    function remove(id) {
      write(read().filter(function (x) { return x.id !== id }))
      render()
    }

    function checkout(btn, status) {
      btn.disabled = true
      btn.textContent = 'Taking you to checkout…'
      fetch('/api/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ items: read() }),
      })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, body: j } }) })
        .then(function (res) {
          if (res.ok && res.body.url) { window.location.href = res.body.url; return }
          throw new Error(res.body.error || 'Checkout failed')
        })
        .catch(function (err) {
          status.hidden = false
          status.textContent = err.message
          btn.disabled = false
          btn.textContent = 'Checkout securely'
        })
    }

    var ids = read().map(function (l) { return l.id })
    if (ids.length === 0) { render(); return }
    fetch('/api/basket?ids=' + ids.join(','))
      .then(function (r) { return r.json() })
      .then(function (data) {
        shipping = data.shipping_pence
        data.products.forEach(function (p) { products[p.id] = p })
        // Tidy up: drop pots that are gone, and trim quantities to what's in stock.
        var changed = false
        var lines = read().filter(function (l) {
          var p = products[l.id]
          if (!p || p.stock <= 0) { changed = true; return false }
          if (l.qty > p.stock) { l.qty = p.stock; changed = true }
          return true
        })
        if (changed) write(lines)
        render(changed ? 'Your basket has been updated, as something has sold since you added it.' : '')
      })
      .catch(function () {
        root.replaceChildren(h('p', { class: 'notice', text: 'Couldn’t load your basket. Please refresh the page.' }))
      })
  }

  document.addEventListener('DOMContentLoaded', function () {
    updateCount()
    initAddForms()
    initGallery()
    initBasketPage()
    // Back from a successful Square payment: empty the basket.
    if (document.querySelector('[data-clear-basket]')) write([])
  })
  // Keep the count right if the basket changes in another tab.
  window.addEventListener('storage', function (e) { if (e.key === KEY) updateCount() })
})()
