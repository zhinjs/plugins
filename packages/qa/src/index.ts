import {Bot} from "zhin";
import '@zhinjs/plugin-database'
import {QA} from "./models";
import teach from './teach'
import receiver from './receiver'
export const name='qa'
export const using=['database']
export function install(bot:Bot){
    bot.database.define('QA',QA)
    bot.plugin({name:'qa/teach',install:teach})
    bot.plugin({name:'qa/receiver',install:receiver})
}