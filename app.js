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

app.get('/streams', async function (req, res) {
    let offset = req.query.offset
    let gameId = req.query.gameId
    let token = req.query.token
    if (offset !== undefined && gameId !== undefined && (parseInt(offset) % 100) === 0) {
        if (data.streams[gameId] === undefined) {
            data.streams[gameId] = {}
        }
        if (data.streams[gameId][offset] === undefined) {
            data.streams[gameId][offset] = {
                data: [],
                timestamp: 0,
                cursor: ''
            }
        }
        if (Date.now() - data.streams[gameId][offset].timestamp > 30000) {
            console.log('GENERATING NEW DATA')
            let streamsData = await getStreamPage(offset, gameId, token)
            res.json(streamsData)
        } else {
            console.log('DATA ALREADY STORED')
            res.json(data.streams[gameId][offset])
        }
    } else {
        res.send('Parameter missing/wrong')
    }

})

// function checkTopGames(offset) {
//     let offsetArray = Object.keys(data.topgames)
//     for (let i = 0; i < data.topgames[offset].data.length; i++) {
//         let newGame = data.topgames[offset].data[i]
//         for (let oldOffsets of offsetArray) {
//             if (parseInt(oldOffsets) !== parseInt(offset)) {
//                 // console.log(oldOffsets, "oldoffset")
//                 // console.log(offset, "offset")
//                 for (let j = 0; j < data.topgames[oldOffsets].data.length; j++) {
//                     let oldGame = data.topgames[oldOffsets].data[j]
//                     if (newGame.game._id === oldGame.game._id) {
//                         console.log(newGame.game.name + ' == ' + oldGame.game.name ," MOVED POSITION !")
//                         if (data.topgames[offset].timestamp > data.topgames[oldOffsets].timestamp) {
//                             console.log(data.topgames[oldOffsets].data[j])
//                             data.topgames[oldOffsets].data.splice(j, 1)
//                             // console.log('cut from offset: ', oldOffsets)
//                             // console.log('index: ', j)

//                         } else {
//                             console.log(data.topgames[offset].data[i])
//                             data.topgames[offset].data.splice(i, 1)
//                             // console.log('cut from offset: ', offset)
//                             // console.log('index: ', i)
//                         }
//                     }
//                 }
//             }
//         }
//     }
// }

function generateStreamUrl(offset, gameId, token) {
    let url = 'https://api.twitch.tv/helix/streams?first=100'
    url += '&game_id=' + gameId
    if (parseInt(offset) !== 0) {
        url += '&after=' + data.streams[gameId][parseInt(offset) - 100].cursor
    }
    url += '&client_id='
    if (token !== undefined) {
        url += token
    } else {
        url += apiKeys.twitch
    }
    return url
}

async function getStreamPage(offset, gameId, token) {
    let url = generateStreamUrl(offset, gameId, token)
    console.log(url)
    let streams = await fetch(url,
        {
            method: 'GET',
            headers: {
                'Client-ID': (token !== undefined) ? token : apiKeys.twitch,
                'Accept': 'application/vnd.twitchtv.v5+json'
            },
            mode: 'cors',
            cache: 'default'
        });
    let streamsJson = await streams.json();
    console.log(streamsJson)
    data.streams[gameId][offset].data = streamsJson.data;
    data.streams[gameId][offset].timestamp = Date.now();
    data.streams[gameId][offset].cursor = streamsJson.pagination.cursor;
    return data.streams[gameId][offset]
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
    // checkTopGames(offset)
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
