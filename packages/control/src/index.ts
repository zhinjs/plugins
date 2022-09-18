import {Bot} from "zhin";
import {resolve} from 'path'
import {AuthService} from './authService'
export {UserAuth,UserLogin,UserUpdate} from'./authService'
import '@zhinjs/plugin-console'
import {BotService} from "./botService";
export const using=['console']
export interface Config{}
export function install(bot:Bot,config:Config={}){
    bot.console.addEntry(resolve(__dirname,'../client/index.ts'))
    bot.service('console.user',new AuthService(this,bot,config))
    bot.service('console.bot',new BotService(this,bot))
}