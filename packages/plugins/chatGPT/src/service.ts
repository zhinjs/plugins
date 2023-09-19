import {ChatGPTAPI} from "chatgpt";
import fetch from 'isomorphic-fetch'
import {Element, Context, Schema, Dict} from 'zhin'

type Role = 'user' | 'assistant';
declare module 'zhin' {
    namespace Zhin{
        interface Services{
            chatgpt:ChatGPTService
        }
    }
}
type SendMessageOptions = {
    conversationId?: string;
    parentMessageId?: string;
    messageId?: string;
    stream?: boolean;
    promptPrefix?: string;
    promptSuffix?: string;
    timeoutMs?: number;
    onProgress?: (partialResponse: ChatMessage) => void;
    abortSignal?: AbortSignal;
};

interface ChatMessage {
    id: string;
    text: string;
    role: Role;
    parentMessageId?: string;
    conversationId?: string;
    detail?: any;
}

interface History {
    conversationId?: string;
    parentMessageId?: string;
}

export class ChatGPTService {
    api: ChatGPTAPI;
    /** 消息历史 */
    historyList: Map<number|string, History>;
    /** 消息队列 */
    messageQueue: string[];

    constructor(public ctx:Context,private config:Dict) {
        if(!config.timeout) config.timeout=ctx.zhin.options.delay.timeout||=60*1000
        if(!config.api_key) {
            this.ctx.logger.warn('你没有添加 api key ，ChatGPT 服务将无法正常使用')
            return
        }
        this.historyList = new Map();
        this.messageQueue = [];
        this.api = new ChatGPTAPI({
            apiKey: config.api_key,
            apiBaseUrl:config.proxy_url,
            fetch
        });
    }
    private trySend(question:string,options:SendMessageOptions){
        return new Promise<ChatMessage>((resolve,reject)=>{
            const dispose=this.ctx.setTimeout(()=>{
                reject('哦，原来是超时了')
            },this.config.timeout)
            this.api.sendMessage(question, options).then((res)=>{
                dispose()
                resolve(res as any)
            })
        })
    }
    async getAnswerWithQuestion(user_id: number|string, question: Element.Fragment): Promise<string> {
        question=Element.stringify(question)
        if (!this.api) {
            throw new Error('你没有添加 api key ，ChatGPT 服务将无法正常使用');
        }
        this.messageQueue.push(question);

        let history: History = this.historyList.get(user_id);
        if(!history){
            this.historyList.set(user_id,{})
            history=this.historyList.get(user_id)
        }
        const options: SendMessageOptions = {
            conversationId: history.conversationId,
            parentMessageId: history.parentMessageId,
        };
        try{

            const { conversationId, parentMessageId, text } = await this.trySend(question,options);
            history.conversationId = conversationId;
            history.parentMessageId = parentMessageId;

            this.historyList.set(user_id, history);
            this.ctx.setTimeout(()=>{
                this.historyList.delete(user_id)
            },60000*30)
            return ;
        }catch (e){
            const matchReasonReg=/reson:(.+)/
            if(matchReasonReg.test(e.message+'')){
                const reason=String(e.message).match(matchReasonReg)
                return `哦豁，报错了：${reason[1]}`
            }
            return `哦豁，报错了:${e.message}`
        }
    }

    /**
     * 获取消息队列
     */
    getMessageQueue(): string[] {
        return this.messageQueue;
    }
}
