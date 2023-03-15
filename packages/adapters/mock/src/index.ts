import {Adapter} from "zhin";
import {MockAdapter} from "./adapter";
import {MockBot} from "./bot";
export {User,Member,Friend} from './user'
export {Sender} from './sender'
export {Group} from './group'
Adapter.define('mock',MockAdapter,MockBot)
export {MockBot,MockAdapter}