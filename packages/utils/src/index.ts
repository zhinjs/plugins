import {Context, Schema, useOptions} from "zhin";
import {install as request} from './request'
import {Request} from "./request";
import * as time from './time'
import * as math from './math'
export * from './request'
declare module 'zhin'{
    namespace Zhin{
        interface Services{
            axios:Request
        }
    }
}
export const name='utils'
export const Config=Schema.object({
    time:Schema.boolean(),
    math:Schema.boolean()
})
export function install(ctx:Context){
    let config:Utils.Config=useOptions('plugin.utils')
    if(!config) config={}
    ctx.command('utils')
        .desc('公共工具')
    config.time!==false && ctx.plugin(time)
    config.math!==false && ctx.plugin(math)

    ctx.plugin(request)
}
export namespace Utils{
    export interface Config{
        request?:Request.Config
        time?:boolean
        math?:boolean
    }
}