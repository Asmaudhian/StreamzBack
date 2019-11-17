const express = require('express')
const app = express()
const apiKeys = require('./apiKey.js')
const fetch = require('isomorphic-unfetch')
const Mixer = require('@mixer/client-node')
const clientMixer = new Mixer.Client(new Mixer.DefaultRequestRunner())
const {google} = require('googleapis')

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
    var service = google.youtube('v3');
    service.liveStreams.list({
        auth: apiKeys.youtube,
        part: 'snippet,contentDetails,statistics',
        forUsername: 'GoogleDevelopers'
    }, function (err, response) {
        if (err) {
            console.log('The API returned an error: ' + err);
            return;
        }
        var channels = response.data.items;
        if (channels.length == 0) {
            console.log('No channel found.');
        } else {
            console.log('This channel\'s ID is %s. Its title is \'%s\', and ' +
                'it has %s views.',
                channels[0].id,
                channels[0].snippet.title,
                channels[0].statistics.viewCount);
        }
    });
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
