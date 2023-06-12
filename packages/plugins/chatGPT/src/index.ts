import {Element, Session, useContext, useOptions} from "zhin";
import {ChatGPTService} from "./service";
const ctx=useContext()
const apiKey=ChatGPTService.Config(useOptions('plugins.chatgpt'))
ctx.service('chatgpt',ChatGPTService,apiKey)
ctx.command('咨询 <question:any>')
.action<Session>(async ({session:{user_id}},message)=>{
    const result=await ctx.chatgpt.getAnswerWithQuestion(user_id,message)
    const dispose=ctx.middleware(async (session, next)=>{
        await next()
        if(!session.quote) return
        dispose()
        const preMsg=Element.stringify(session.quote.element)
        if(preMsg===result){
            await session.reply(await ctx.chatgpt.getAnswerWithQuestion(session.user_id,session.content))
        }
    })
    ctx.setTimeout(()=>{
        dispose()
    },60000)
    return result
})
