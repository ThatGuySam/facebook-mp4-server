'use strict'

const { fetchText } = require('./fetch-text')

const ALLOWED_MEDIA_HOST_SUFFIXES = ['facebook.com', 'fbcdn.net', 'fbsbx.com']

const SOURCE_PATTERNS = {
    high: [
        /hd_src:\"((?:\\.|[^\"\\])*)\"/,
        /\"browser_native_hd_url\":\"((?:\\.|[^\"\\])*)\"/,
        /\"playable_url_quality_hd\":\"((?:\\.|[^\"\\])*)\"/,
    ],
    low: [
        /sd_src:\"((?:\\.|[^\"\\])*)\"/,
        /\"browser_native_sd_url\":\"((?:\\.|[^\"\\])*)\"/,
        /\"playable_url\":\"((?:\\.|[^\"\\])*)\"/,
    ],
}

function decodeJavaScriptString(value) {
    return JSON.parse(`\"${value}\"`)
}

function normalizeVideoUrl(value) {
    const url = new URL(value)
    const isAllowedHost = ALLOWED_MEDIA_HOST_SUFFIXES.some(suffix => (
        url.hostname === suffix || url.hostname.endsWith(`.${suffix}`)
    ))

    if (url.protocol !== 'https:' || !isAllowedHost) {
        throw new Error(`Refusing unexpected video URL: ${url.origin}`)
    }

    return url.href
}

function extractVideoUrl(html, quality = 'high') {
    const patterns = SOURCE_PATTERNS[quality]

    if (!patterns) {
        throw new Error(`Unsupported video quality: ${quality}`)
    }

    for (const pattern of patterns) {
        const match = pattern.exec(html)

        if (match) {
            return normalizeVideoUrl(decodeJavaScriptString(match[1]))
        }
    }

    throw new Error(`No ${quality}-quality video source found`)
}

async function getFacebookVideo(url, quality = 'high') {
    const html = await fetchText(url, { allowedHostSuffixes: ['facebook.com'] })

    return { url: extractVideoUrl(html, quality) }
}

module.exports = { extractVideoUrl, getFacebookVideo }
