import {Bot} from "zhin";
export const name ='admin'
export const using=['prompt'] as const
import * as group from './group'
export function install(bot:Bot){
    bot.command('admin')
        .desc('管理知音')
    bot.plugin(group)
}