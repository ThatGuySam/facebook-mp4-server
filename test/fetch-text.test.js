'use strict'

const assert = require('node:assert/strict')
const http = require('node:http')
const test = require('node:test')

const { fetchText } = require('../lib/fetch-text')

async function listen(handler) {
    const server = http.createServer(handler)
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))

    return {
        close: () => new Promise(resolve => server.close(resolve)),
        origin: `http://127.0.0.1:${server.address().port}`,
    }
}

test('fetches text and follows a bounded redirect', async t => {
    const server = await listen((request, response) => {
        if (request.url === '/redirect') {
            response.writeHead(302, { location: '/page' })
            response.end()
            return
        }

        response.end('facebook page')
    })
    t.after(server.close)

    assert.equal(await fetchText(`${server.origin}/redirect`), 'facebook page')
})

test('rejects oversized responses', async t => {
    const server = await listen((_request, response) => response.end('too large'))
    t.after(server.close)

    await assert.rejects(
        fetchText(server.origin, { maxBytes: 3 }),
        /Response exceeded 3 bytes/,
    )
})

test('rejects redirects outside an allowed host suffix', async t => {
    const server = await listen((_request, response) => {
        response.writeHead(302, { location: 'http://example.com/page' })
        response.end()
    })
    t.after(server.close)

    await assert.rejects(
        fetchText(server.origin, { allowedHostSuffixes: ['127.0.0.1'] }),
        /Refusing to request unexpected host: example.com/,
    )
})

test('rejects an initial URL outside an allowed host suffix', async () => {
    await assert.rejects(
        fetchText('https://example.com', { allowedHostSuffixes: ['facebook.com'] }),
        /Refusing to request unexpected host: example.com/,
    )
})
