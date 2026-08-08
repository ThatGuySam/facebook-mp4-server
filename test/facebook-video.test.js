'use strict'

const assert = require('node:assert/strict')
const test = require('node:test')

const { extractVideoUrl } = require('../lib/facebook-video')

test('extracts the legacy high-quality Facebook source', () => {
    const html = 'before hd_src:\"https:\\/\\/video.xx.fbcdn.net\\/high.mp4?x=1\\u0026y=2\",sd_src:\"ignored\" after'

    assert.equal(extractVideoUrl(html), 'https://video.xx.fbcdn.net/high.mp4?x=1&y=2')
})

test('extracts the structured low-quality Facebook source', () => {
    const html = '{\"browser_native_sd_url\":\"https:\\/\\/video.xx.fbcdn.net\\/low.mp4\"}'

    assert.equal(extractVideoUrl(html, 'low'), 'https://video.xx.fbcdn.net/low.mp4')
})

test('fails clearly when Facebook does not expose the requested source', () => {
    assert.throws(
        () => extractVideoUrl('<html></html>'),
        /No high-quality video source found/,
    )
})

test('rejects an extracted URL outside Facebook media hosts', () => {
    const html = 'hd_src:\"https:\\/\\/example.com\\/not-facebook.mp4\"'

    assert.throws(
        () => extractVideoUrl(html),
        /Refusing unexpected video URL: https:\/\/example.com/,
    )
})

test('rejects a non-HTTPS media URL', () => {
    const html = 'hd_src:\"javascript:alert(1)\"'

    assert.throws(
        () => extractVideoUrl(html),
        /Refusing unexpected video URL: null/,
    )
})
