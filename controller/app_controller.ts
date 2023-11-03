import axios, { AxiosHeaders } from "axios";
require('dotenv').config()

const slackToken = `${process.env.SLACK_BOT_TOKEN}`

interface FileInfo {
    ok: boolean
    url_download?: string
}

export async function getFileInfo(fileId: string): Promise<FileInfo> {
    axios.AxiosHeaders
    const res = await axios.get(`https://slack.com/api/files.info?file=${fileId}`, {
        headers: new AxiosHeaders({
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Bearer ${slackToken}`
        })
    })

    if (res.status !== 200) return { ok: false }

    return {
        ok: true,
        url_download: res.data.file.url_private
    } as FileInfo
}