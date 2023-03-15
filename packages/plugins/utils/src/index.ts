import {Context,Element, Schema, useOptions} from "zhin";
import * as time from './time'
import * as math from './math'
import * as request from './request'
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
    ctx.command('取源 [source:any]')
        .desc('获取消息源文件')
        .action(async ({session},source)=>{
            if(!source){
                if(session.quote) {
                    const message=await session.bot.callApi('getMsg',session.quote.message_id)
                    return Element('text',{text:message.elements.join('')})
                }
                source = await session.prompt.any()
            }
            return Element('text',{text:source.join('')})
        })
    config.time!==false && ctx.plugin(time)
    config.math!==false && ctx.plugin(math)
    ctx.plugin(request)
}
export namespace Utils{
    export interface Config{
        time?:boolean
        math?:boolean
    }
}