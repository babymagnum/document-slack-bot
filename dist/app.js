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
require('dotenv').config();
const slackSigninSecret = `${process.env.SLACK_SIGNING_SECRET}`;
const slackToken = `${process.env.SLACK_TOKEN}`;
const slackPort = 3000;
const slackEvent = (0, events_api_1.createEventAdapter)(slackSigninSecret);
const slackClient = new web_api_1.WebClient(slackToken);
function documentHandler() {
    return __awaiter(this, void 0, void 0, function* () {
        slackEvent.on('app_mention', (event) => __awaiter(this, void 0, void 0, function* () {
            console.log(`Got message from user, ${event.user} ${event.text}`);
            yield replyToUser(event);
        }));
        slackEvent.on('error', console.error);
        slackEvent.start(slackPort).then(() => {
            console.log(`server start on server ${slackPort}`);
        });
    });
}
exports.default = documentHandler;
function replyToUser(event) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield slackClient.chat.postMessage({
                channel: event.channel,
                text: 'Hello brother'
            });
        }
        catch (error) {
            console.log(error);
        }
    });
}
