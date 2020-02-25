const express = require('express')
const app = express()
const apiKeys = require('./apiKey.js')
const data = require('./data.js')
const fetch = require('isomorphic-unfetch')
const Mixer = require('@mixer/client-node')
const clientMixer = new Mixer.Client(new Mixer.DefaultRequestRunner())
const { google } = require('googleapis')
const cors = require('cors')

// const youtube = google.youtube({
//     version: 'v3',
//     auth: apiKeys.youtube
//  });

app.use(cors())

clientMixer.use(new Mixer.OAuthProvider(clientMixer, {
    clientId: apiKeys.mixer
}))

app.get('/', async function (req, res) {
    // let mixerData = await getMixerBaseData()
    let twitchData = await getTwitchBaseData()
    // getYouTubeBaseData();
    res.json(twitchData)
})

// app.get('/topgames', async function (req, res) {
//     let twitchData = await getTwitchBaseData(0)
//     res.json(twitchData)
// })

app.get('/topgames/:offset', async function (req, res) {
    let offset = req.params.offset
    if ((offset % 100) === 0) {
        if (data.topgames[offset] === undefined) {
            data.topgames[offset] = {
                data: [],
                timestamp: 0
            }
        }
        if (Date.now() - data.topgames[offset].timestamp > 30000) {
            console.log('GENERATING NEW DATA')
            let twitchData = await getTwitchBaseData(offset)
            res.json(twitchData)
        } else {
            console.log('DATA ALREADY STORED')
            res.json(data.topgames[offset])
        }
    } else {
        res.send('ERROR IN OFFSET NUMBER')
    }
})

function checkTopGames(offset) {
    let offsetArray = Object.keys(data.topgames)
    for (let i = 0; i < data.topgames[offset].data.length; i++) {
        let newGame = data.topgames[offset].data[i]
        for (let oldOffsets of offsetArray) {
            if (parseInt(oldOffsets) !== parseInt(offset)) {
                // console.log(oldOffsets, "oldoffset")
                // console.log(offset, "offset")
                for (let j = 0; j < data.topgames[oldOffsets].data.length; j++) {
                    let oldGame = data.topgames[oldOffsets].data[j]
                    if (newGame.game._id === oldGame.game._id) {
                        console.log(newGame.game.name ," MOVED POSITION !")
                        if (data.topgames[offset].timestamp > data.topgames[oldOffsets].timestamp) {
                            data.topgames[oldOffsets].data.splice(j, 1)
                            console.log(data.topgames[oldOffsets].data.splice(j, 1))
                            console.log('cut from offset: ', oldOffsets)
                        } else {
                            data.topgames[offset].data.splice(i, 1)
                            console.log(data.topgames[offset].data.splice(i, 1))
                            console.log('cut from offset: ', offset)
                        }
                    }
                }
            }
        }
    }
}

async function getTwitchBaseData(offset) {
    let games = await fetch('https://api.twitch.tv/kraken/games/top?limit=100&offset=' + offset + '&client_id=' + apiKeys.twitch,
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

    data.topgames[offset].data = gamesJson.top;
    data.topgames[offset].timestamp = Date.now();
    checkTopGames(offset)
    return data.topgames[offset]
}

app.get('/auth/twitch', async function (req, res) {
    let userAccess = await fetch('https://id.twitch.tv/oauth2/token?client_id=' + apiKeys.twitch + '&client_secret=' + apiKeys.secretTwitch + '&code=' + req.query.code + '&grant_type=authorization_code&redirect_uri=http://localhost:3000/auth/twitch', {
        method: "POST"
    })
    let userAccessJson = await userAccess.json();
    console.log(userAccessJson)
    res.json(userAccessJson)
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



app.listen(3030, function () {
    console.log('Example app listening on port 3030!')
})
