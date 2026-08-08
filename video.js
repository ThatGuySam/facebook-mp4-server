
const { parse } = require('node:url')

const { getFacebookVideo } = require('./lib/facebook-video')

module.exports = async function (req, res) {
    // Break out the id param from our request's query string
    const { query: { id, redirect = false } } = parse(req.url, true)
    // const perPage = 50

    const videoUrl = `https://www.facebook.com/${id}`

    const { videoData = null, error = null } = await getFacebookVideo(videoUrl, 'high').then(videoData => {
        // console.log(videoData)
        return { videoData }
        // => { url: 'https://video.fpat1-1.fna.fbcdn.net/...mp4?934&OE=2kf2lf4g' }
    }).catch(error => {
        console.warn(`Error fetching video ${id}`, error)

        return { error }
    })

    // Set Cors Headers to allow all origins so data can be requested by a browser
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")

    // Send an error response if something went wrong
    if (error !== null) {
        res.json({
            error: 'Error fetching'
        })
        
        // Fire 
        return
    }

    if ( redirect ) {
        // 307 - Temporary Redirect
        res.statusCode = 307
        res.setHeader('Location', videoData.url)
        res.end()

        return
    }

    console.log(`Fetched mp4 video from https://www.facebook.com/${id}`)

    res.json(videoData)
}
