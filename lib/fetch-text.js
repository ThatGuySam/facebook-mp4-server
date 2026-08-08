'use strict'

const http = require('node:http')
const https = require('node:https')

const DEFAULT_MAX_BYTES = 5 * 1024 * 1024
const DEFAULT_MAX_REDIRECTS = 5
const DEFAULT_TIMEOUT_MS = 10_000

function fetchText(input, options = {}) {
    const {
        allowedHostSuffixes = null,
        maxBytes = DEFAULT_MAX_BYTES,
        maxRedirects = DEFAULT_MAX_REDIRECTS,
        timeoutMs = DEFAULT_TIMEOUT_MS,
    } = options

    return requestText(new URL(input), {
        allowedHostSuffixes,
        maxBytes,
        redirectsRemaining: maxRedirects,
        timeoutMs,
    })
}

function requestText(url, options) {
    if (options.allowedHostSuffixes && !isAllowedHost(url.hostname, options.allowedHostSuffixes)) {
        return Promise.reject(new Error(`Refusing to request unexpected host: ${url.hostname}`))
    }

    const transport = url.protocol === 'https:' ? https : url.protocol === 'http:' ? http : null

    if (transport === null) {
        return Promise.reject(new Error(`Unsupported protocol: ${url.protocol}`))
    }

    return new Promise((resolve, reject) => {
        const request = transport.get(url, {
            headers: {
                accept: 'text/html,application/xhtml+xml',
                'user-agent': 'Mozilla/5.0 (compatible; facebook-mp4-server/1.0)',
            },
        }, response => {
            const location = response.headers.location

            if (response.statusCode >= 300 && response.statusCode < 400 && location) {
                response.resume()

                if (options.redirectsRemaining === 0) {
                    reject(new Error('Too many redirects'))
                    return
                }

                const redirectUrl = new URL(location, url)
                requestText(redirectUrl, {
                    ...options,
                    redirectsRemaining: options.redirectsRemaining - 1,
                }).then(resolve, reject)
                return
            }

            if (response.statusCode < 200 || response.statusCode >= 300) {
                response.resume()
                reject(new Error(`Unexpected response status: ${response.statusCode}`))
                return
            }

            const chunks = []
            let receivedBytes = 0

            response.on('data', chunk => {
                receivedBytes += chunk.length

                if (receivedBytes > options.maxBytes) {
                    response.destroy(new Error(`Response exceeded ${options.maxBytes} bytes`))
                    return
                }

                chunks.push(chunk)
            })

            response.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
            response.on('error', reject)
        })

        request.setTimeout(options.timeoutMs, () => {
            request.destroy(new Error(`Request timed out after ${options.timeoutMs}ms`))
        })

        request.on('error', reject)
    })
}

function isAllowedHost(hostname, suffixes) {
    return suffixes.some(suffix => hostname === suffix || hostname.endsWith(`.${suffix}`))
}

module.exports = { fetchText }
