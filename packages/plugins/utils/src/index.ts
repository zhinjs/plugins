import {Context, Element,h, Schema, Session, useOptions} from "zhin";
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
    ctx.command('取源')
        .desc('获取消息源文件')
        .action<Session>(async ({session})=>{
            if(session.quote) {
                const message=await session.bot.getMsg(session.quote.message_id)
                if(!message.content) return '取不了'
                return h('text',{text:message.content})
            }
            const source= await session.prompt.any('请发送')
            return h('text',{text:Element.stringify(source)})
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
