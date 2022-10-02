import {Bot} from "zhin";
import * as config from './config'
import * as groupAdmin from './group'
import * as pluginManage from './plugin'
export const name ='admin'
export function install(bot:Bot){
    bot.command('admin')
        .desc('管理知音')
    bot.plugin(config)
    bot.plugin(groupAdmin)
    bot.plugin(pluginManage)
}