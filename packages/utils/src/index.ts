import {Bot} from "zhin";
import * as time from './time'
import {install as request} from './request'
import * as math from './math'
import {Request} from "./request";
export * from './request'
import * as status from './status'
import * as logs from './logs'
declare module 'zhin'{
    namespace Bot{
        interface Services{
            axios:Request
        }
    }
}
export const name='utils'
export function install(bot:Bot,config:Utils.Config={}){
    if(!config) config={}
    bot.command('utils')
        .desc('公共工具')
    config.time!==false && bot.plugin(time)
    config.math!==false && bot.plugin(math)
    bot.plugin(request)
    bot.plugin(logs)
    bot.plugin(status)
}
export namespace Utils{
    export interface Config{
        axios?:Request
        time?:boolean
        math?:boolean
    }
}