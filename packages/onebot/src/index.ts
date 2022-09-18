import {Bot,Plugin,deepMerge} from "zhin";
import {OneBot} from "./onebot";
import {OneBotConfig,defaultOneBotConfig} from "./config";
declare module 'zhin'{
    namespace Bot{
        interface Services{
            oneBot?:OneBot
        }
    }
}
export const using=['http']
export async function install(this:Plugin,bot:Bot,config:Partial<OneBotConfig>={}){
    if(config===null)config={}
    if(!config){return}
    bot.service('oneBot',OneBot,deepMerge(defaultOneBotConfig,config))
    bot.on('message',(data)=>bot.oneBot.dispatch(data))
    bot.on('notice',(data)=>bot.oneBot.dispatch(data))
    bot.on('request',(data)=>bot.oneBot.dispatch(data))
    bot.on('system',(data)=>bot.oneBot.dispatch(data))
    await bot.oneBot.start()
    this.disposes.push(()=>{
        if(bot.oneBot){
            bot.oneBot.stop()
        }
        return true
    })
}
