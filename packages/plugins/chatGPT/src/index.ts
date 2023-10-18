import {Element, Schema, Session, useContext} from "zhin";
import {ChatGPTService} from "./service";
const ctx=useContext()
const config=ctx.useOptions('plugins.chatgpt',Schema.object({
    api_key:Schema.string().required().description('chatGPT的key'),
    proxy_url:Schema.string().description('代理地址'),
    session_timeout:Schema.number().description('会话超时时间，单位秒 默认(30)').default(30),
    max_history_len: Schema.number().description('会话最大长度 默认：1').default(1),
    img_size: Schema.union([
        Schema.const(256),
        Schema.const(512),
        Schema.const(1024),
    ] as const).description('图片尺寸').default(256),
    timeout:Schema.number().description('请求超时时间(单位：ms)')
}))
ctx.service('chatgpt',ChatGPTService,config)
ctx.command('咨询 <question:text>')
.action<Session>(async ({session:{user_id}},message)=>{
    const result=await ctx.chatgpt.getAnswerWithQuestion(user_id+'',message)
    const dispose=ctx.middleware(async (session, next)=>{
        await next()
        if(!session.quote) return
        dispose()
        const preMsg=Element.stringify(session.quote.content)
        if(ctx.chatgpt.hasAnswer(String(session.quote.user_id),preMsg)){
            await session.reply(await ctx.chatgpt.getAnswerWithQuestion(session.user_id+'',session.content,ctx.chatgpt.getHistory(String(session.quote.user_id))))
        }
    })
    ctx.setTimeout(()=>{
        dispose()
    },60000)
    return result
})
ctx.command('绘图 <prompt:text>')
.action<Session>(async ({session},message)=>{
    session.reply('等一下哦，在画了')
    const result=await ctx.chatgpt.drawImage(session.user_id+'',message)
    return `<image src="base64://${result}"/>`
})
