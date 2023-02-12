import {Context} from "zhin";
export const name ='admin'
import * as group from './group'
export function install(ctx:Context){
    ctx.command('admin')
        .desc('管理知音')
    ctx.plugin(group)
}