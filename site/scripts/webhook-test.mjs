// Local test: signs a fake "payment COMPLETED" webhook like Square does and sends it to wrangler dev.
// Needs SQUARE_WEBHOOK_SIGNATURE_KEY=local-test-signing-key in .dev.vars and a pending order with
// square_order_id = TEST-SQ-1 in the local database. Run: node scripts/webhook-test.mjs
import crypto from 'node:crypto'
const URL_ = 'http://localhost:8787/api/square/webhook', KEY = 'local-test-signing-key'
const event = { type: 'payment.updated', data: { object: { payment: {
  id: 'pay_test', status: 'COMPLETED', order_id: 'TEST-SQ-1', amount_money: { amount: 18100, currency: 'GBP' },
  buyer_email_address: 'sidneypinsent3@hotmail.co.uk',
  shipping_address: { first_name: 'Test', last_name: 'Buyer <b>', address_line_1: '1 High Street', locality: 'Shipston-on-Stour', postal_code: 'CV36 4AA', country: 'GB' } } } } }
const body = JSON.stringify(event)
const sign = (k) => crypto.createHmac('sha256', k).update(URL_ + body).digest('base64')
const send = async (sig) => { const r = await fetch(URL_, { method: 'POST', headers: { 'content-type': 'application/json', ...(sig ? { 'x-square-hmacsha256-signature': sig } : {}) }, body }); return r.status + ' ' + await r.text() }
const co = await fetch('http://localhost:8787/api/checkout', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ items: [{ id: 1, qty: 1 }] }) })
console.log('checkout without Square keys:', co.status, await co.text())
console.log('no signature:   ', await send(null))
console.log('wrong key:      ', await send(sign('wrong-key')))
console.log('valid:          ', await send(sign(KEY)))
console.log('duplicate:      ', await send(sign(KEY)))
