import {Element, Schema, Session, useContext} from "zhin";
import {ChatGPTService} from "./service";
const ctx=useContext()
const apiKey=ctx.useOptions('plugins.chatgpt',Schema.object({
    api_key:Schema.string().required().description('chatGPT的key'),
    proxy_url:Schema.string().description('代理地址'),
    timeout:Schema.number().description('请求超时时间(单位：ms)')
}))
ctx.service('chatgpt',ChatGPTService,apiKey)
ctx.command('咨询 <question:any>')
.action<Session>(async ({session:{user_id}},message)=>{
    const result=await ctx.chatgpt.getAnswerWithQuestion(user_id,message)
    const dispose=ctx.middleware(async (session, next)=>{
        await next()
        if(!session.quote) return
        dispose()
        const preMsg=Element.stringify(session.quote.content)
        if(preMsg===result){
            await session.reply(await ctx.chatgpt.getAnswerWithQuestion(session.user_id,session.content))
        }
    })
    ctx.setTimeout(()=>{
        dispose()
    },60000)
    return result
})
