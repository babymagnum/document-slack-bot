import { WebClient } from "@slack/web-api"
import { createEventAdapter } from "@slack/events-api"
import { fetchDocumentData, getFileInfo } from "../controller/app_controller"
import { LastResponse } from "../controller/interfaces"
require('dotenv').config()

const slackSigninSecret = `${process.env.SLACK_SIGNING_SECRET}`
const slackToken = `${process.env.SLACK_BOT_TOKEN}`
const slackPort = 3000
 
const slackEvent = createEventAdapter(slackSigninSecret)
const slackClient = new WebClient(slackToken)

let lastResponse: LastResponse|undefined = undefined

slackEvent.on('message', async (event) => {
    if (!event.user || !event.text) return
    if (event.user === 'U064A5HGUAG') return

    console.log(`message in ${event.channel} ==> ${event.user} ${event.text}`)

    try {
        const waitingMessage = await slackClient.chat.postMessage({
            channel: event.channel,
            text: 'Please wait, we are preparing your answer... :pray:'
        })

        const response = await fetchDocumentData(event.text, lastResponse)

        if (response === null) {
            await slackClient.chat.postMessage({
                channel: event.channel,
                text: 'Ooops, dokumen yg tersedia tidak ada yg mengandung jawaban atas pertanyaan Anda!'
            })
            return
        }

        lastResponse = {
            lastQuestion: event.text,
            document: response.document,
            keyword: response.keyword,
            answer: response.answer
        }

        await slackClient.chat.delete({
            channel: event.channel,
            ts: waitingMessage.ts || ''
        })

        await slackClient.chat.postMessage({
            channel: event.channel,
            text: response.answer
        })
    } catch (error) {
        await slackClient.chat.postMessage({
            channel: event.channel,
            text: `${error}`
        })
    }
})

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

slackEvent.on('error', console.error)

slackEvent.start(slackPort).then(() => {
    console.log(`server start on server ${slackPort}`)
})