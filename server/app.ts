import { WebClient } from "@slack/web-api"
import { createEventAdapter } from "@slack/events-api"
import { getFileInfo } from "../controller/app_controller"
require('dotenv').config()

const slackSigninSecret = `${process.env.SLACK_SIGNING_SECRET}`
const slackToken = `${process.env.SLACK_BOT_TOKEN}`
const slackPort = 80

const slackEvent = createEventAdapter(slackSigninSecret)
const slackClient = new WebClient(slackToken)

// slackEvent.on('message', async (event) => {
//     console.log(`message ==> ${event.user} ${event.text}`)
// })

slackEvent.on('file_created', async (event) => {
    console.log(`file_created ==> ${event.user} ${event.text}`)
})

slackEvent.on('file_shared', async (event) => {
    console.log(`file_shared ==> ${event.file_id}`)

    try {
        const response = await getFileInfo(event.file_id)

    if (response.ok) {
        console.log(`success get url download ${response.url_download}`)
    }        
    } catch (error) {
        console.log(`Error => ${error}`)   
    }    
})

slackEvent.on('app_mention', async (event) => {
    console.log(`app_mention ==> ${event.user} ${event.text}`)

    try {
        await slackClient.chat.postMessage({
            channel: event.channel,
            text: 'Hello brother'
        })
    } catch (error) {
        console.log(error)
    }
})

slackEvent.on('url_verification', async (event) => {
    console.log(`url_verification challenge => ${event.challenge}`)
    console.log(`url_verification token => ${event.token}`)
})

slackEvent.on('error', console.error)

slackEvent.start(slackPort).then(() => {
    console.log(`server start on server ${slackPort}`)
})