// Admin helpers: confirm before deleting, and shrink photos in the browser before upload
// (phone photos are often 4-8MB; this makes them ~200-400KB, so uploads are quick and storage stays free).
;(function () {
  'use strict'
  var MAX_SIDE = 1600
  var QUALITY = 0.85

  document.addEventListener('submit', function (ev) {
    var msg = ev.target.getAttribute && ev.target.getAttribute('data-confirm')
    if (msg && !window.confirm(msg)) ev.preventDefault()
  })

  function shrink(file) {
    if (!/^image\//.test(file.type) || !window.createImageBitmap) return Promise.resolve(file)
    return createImageBitmap(file, { imageOrientation: 'from-image' })
      .then(function (bmp) {
        var scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height))
        var canvas = document.createElement('canvas')
        canvas.width = Math.round(bmp.width * scale)
        canvas.height = Math.round(bmp.height * scale)
        canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height)
        return new Promise(function (resolve) { canvas.toBlob(resolve, 'image/webp', QUALITY) }).then(function (blob) {
          // Older Safari can't make WebP and hands back PNG: use JPEG instead.
          if (!blob || blob.type !== 'image/webp') return new Promise(function (r) { canvas.toBlob(r, 'image/jpeg', QUALITY) })
          return blob
        })
      })
      .then(function (blob) {
        if (!blob || blob.size >= file.size) return file
        var ext = blob.type === 'image/webp' ? '.webp' : '.jpg'
        return new File([blob], file.name.replace(/\.[^.]+$/, '') + ext, { type: blob.type })
      })
      .catch(function () { return file }) // couldn't read it: let the server decide
  }

  document.querySelectorAll('input[type=file][data-resize]').forEach(function (input) {
    var form = input.form
    var submit = form.querySelector('[data-submit]')
    var previews = form.querySelector('[data-previews]')
    var busy = false

    input.addEventListener('change', function () {
      var files = Array.prototype.slice.call(input.files || [])
      if (!files.length || busy) return
      busy = true
      if (submit) { submit.disabled = true; submit.dataset.label = submit.textContent; submit.textContent = 'Preparing photos…' }
      Promise.all(files.map(shrink)).then(function (small) {
        try {
          var dt = new DataTransfer()
          small.forEach(function (f) { dt.items.add(f) })
          input.files = dt.files
        } catch (e) { /* very old browser: originals get uploaded instead */ }
        if (previews) {
          previews.replaceChildren()
          small.forEach(function (f) {
            var img = document.createElement('img')
            img.alt = ''
            img.src = URL.createObjectURL(f)
            previews.appendChild(img)
          })
        }
      }).finally(function () {
        busy = false
        if (submit) { submit.disabled = false; submit.textContent = submit.dataset.label }
      })
    })

    form.addEventListener('submit', function (ev) {
      if (busy) { ev.preventDefault(); return }
      if (submit) { submit.disabled = true; submit.textContent = input.files && input.files.length ? 'Uploading…' : 'Saving…' }
    })
  })
})()
