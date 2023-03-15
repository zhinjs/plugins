import {useContext, useOptions,h, Zhin} from "zhin";
import ChatGPT from './api'
const ctx=useContext()
const config=ChatGPT.Config(useOptions('plugins.chatgpt'))
if(!config.cloudflareToken || !config.sessionToken) ctx.logger.warn('未配置API key，ChatGPT 服务将无法正常使用')
else{
    const conversations = new Map<string, { messageId: string; conversationId: string }>()
    const api = new ChatGPT(ctx, config)
    ctx.middleware((session, next)=>{
        if(session.isAtMe()){
            const [_,...elements]=session.elements
            if(elements.length) return session.execute({name:'chatgpt',args:[elements],session:session as any})
        }
        return next()
    })
    ctx.command('chatgpt <input>')
        .option('reset','-r 是否重置会话')
        .action(async( {options,session},elements)=>{
            const key=Zhin.getChannelId(session)
            let input=elements?.join('')
            if(!input) input=await session.prompt.text('请输入问题')
            try{
                await api.ensureAuth()
            }catch (e){
                ctx.logger.warn(e)
                return 'token 无效'
            }
            try {
                const { conversationId, messageId } = conversations.get(key) ?? {}
                const response = await api.sendMessage({ message: input, conversationId, messageId })
                conversations.set(key, { conversationId: response.conversationId, messageId: response.messageId })
                return response.message
            } catch (error) {
                ctx.logger.warn(error)
                return error.message
            }
        })
}

