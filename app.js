const express = require('express')
const app = express()
const apiKeys = require('./apiKey.js')
const fetch = require('isomorphic-unfetch')
const Mixer = require('@mixer/client-node')
const clientMixer = new Mixer.Client(new Mixer.DefaultRequestRunner())
const { google } = require('googleapis')

// const youtube = google.youtube({
//     version: 'v3',
//     auth: apiKeys.youtube
//  });


clientMixer.use(new Mixer.OAuthProvider(clientMixer, {
    clientId: apiKeys.mixer
}))

app.get('/', async function (req, res) {
    let mixerData = await getMixerBaseData()
    // let twitchData = await getTwitchBaseData()
    getYouTubeBaseData();
    res.json(mixerData)
})
app.get('/kek', function (req, res) {
    res.send('Hello World! kek')
})

async function getMixerBaseData() {
    let games = await clientMixer.request('GET', 'types', {
        qs: {
            order: 'viewersCurrent:DESC'
        }
    })
    return games
}

async function getYouTubeBaseData() {
    console.log('https://www.googleapis.com/youtube/v3/search?part=snippet&eventType=live&viewCount=desc&type=video&key=' + apiKeys.youtube)
    let result = await fetch('https://www.googleapis.com/youtube/v3/search?part=snippet&eventType=live&type=video&key=' + apiKeys.youtube)
    let resultJson = await result.json()
    console.log(resultJson)
    // youtube.search.list({
    //     part: 'snippet',
    //     q: 'PewDiePie'
    //   }, function (err, data) {
    //     if (err) {
    //       console.error('Error: ' + err);
    //     }
    //     if (data) {
    //       console.log(data)
    //     }
    //   });
}

async function getTwitchBaseData() {
    let games = await fetch('https://api.twitch.tv/kraken/games/top?client_id=' + apiKeys.twitch,
        {
            method: 'GET',
            headers: {
                'Client-ID': apiKeys.twitch,
                'Accept': 'application/vnd.twitchtv.v5+json'
            },
            mode: 'cors',
            cache: 'default'
        });
    let gamesJson = await games.json()
    return gamesJson
}

app.listen(3000, function () {
    console.log('Example app listening on port 3000!')
})
