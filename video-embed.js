
const { parse } = require('node:url')
const fs = require('node:fs')
const path = require('node:path')

const { getFacebookVideo } = require('./lib/facebook-video')

module.exports = async function (req, res) {
    // Break out the id param from our request's query string
    const { query: { id } } = parse(req.url, true)
    // const perPage = 50

    const videoUrl = `https://www.facebook.com/${id}`

    // Get embed template file
    const document = path.join(__dirname, 'embed-template.html');
    // Convert to string
    const html = fs.readFileSync(document, 'utf8')

    const { videoData = null, error = null } = await getFacebookVideo(videoUrl, 'high').then(videoData => {
        // console.log(videoData)
        return { videoData }
        // => { url: 'https://video.fpat1-1.fna.fbcdn.net/...mp4?934&OE=2kf2lf4g' }
    }).catch(error => {
        console.warn(`Error fetching video ${id}`, error)

        return { error }
    })

    // Send an error response if something went wrong
    if (error !== null) {
        res.json({
            error: 'Error fetching'
        })
        
        // Fire 
        return
    }

    console.log(`Rendered embed of https://www.facebook.com/${id}`, html)

    res.end(html.replace('${mp4_video_source}', videoData.url))
}
