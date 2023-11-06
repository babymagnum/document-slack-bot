"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const web_api_1 = require("@slack/web-api");
const events_api_1 = require("@slack/events-api");
const app_controller_1 = require("../controller/app_controller");
require('dotenv').config();
// test
const slackSigninSecret = `${process.env.SLACK_SIGNING_SECRET}`;
const slackToken = `${process.env.SLACK_BOT_TOKEN}`;
const slackPort = 3000;
const slackEvent = (0, events_api_1.createEventAdapter)(slackSigninSecret);
const slackClient = new web_api_1.WebClient(slackToken);
slackEvent.on('message', (event) => __awaiter(void 0, void 0, void 0, function* () {
    console.log(`message in ${event.channel} ==> ${event.user} ${event.text}`);
    if (event.user === 'U064A5HGUAG')
        return;
    try {
        const response = yield (0, app_controller_1.fetchDocumentData)(event.text);
        if (response === null) {
            yield slackClient.chat.postMessage({
                channel: event.channel,
                text: 'Ooops, dokumen yg tersedia tidak ada yg mengandung jawaban atas pertanyaan Anda!'
            });
            return;
        }
        yield slackClient.chat.postMessage({
            channel: event.channel,
            text: response
        });
    }
    catch (error) {
        yield slackClient.chat.postMessage({
            channel: event.channel,
            text: `${error}`
        });
    }
}));
slackEvent.on('file_created', (event) => __awaiter(void 0, void 0, void 0, function* () {
    console.log(`file_created ==> ${event.user} ${event.text}`);
}));
slackEvent.on('file_shared', (event) => __awaiter(void 0, void 0, void 0, function* () {
    console.log(`file_shared ==> ${event.file_id}`);
    try {
        const response = yield (0, app_controller_1.getFileInfo)(event.file_id);
        if (response.ok) {
            console.log(`success get url download ${response.url_download}`);
        }
    }
    catch (error) {
        console.log(`Error => ${error}`);
    }
}));
slackEvent.on('app_mention', (event) => __awaiter(void 0, void 0, void 0, function* () {
    console.log(`app_mention ==> ${event.user} ${event.text}`);
    try {
        yield slackClient.chat.postMessage({
            channel: event.channel,
            text: 'Hello brother'
        });
    }
    catch (error) {
        console.log(error);
    }
}));
slackEvent.on('error', console.error);
slackEvent.start(slackPort).then(() => {
    console.log(`server start on server ${slackPort}`);
});
