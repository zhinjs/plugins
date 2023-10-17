import OpenAI from "openai";
import {Element, Context, Dict} from 'zhin'
import {ChatCompletion, ChatCompletionMessageParam} from "openai/src/resources/chat/completions";
import {ImagesResponse} from "openai/resources";

declare module 'zhin' {
    namespace Zhin{
        interface Services{
            chatgpt:ChatGPTService
        }
    }
}

type Callback<T>=(resolve:(value:T|PromiseLike<T>)=>void,reject:(reason:any)=>void)=>Promise<void>
export class ChatGPTService {
    api: OpenAI;
    /** 用户与会话键值对 */
    userSessions: Map<number|string, {
        cancelFree?:Function
        history:ChatCompletionMessageParam[]
    }>;

    constructor(public ctx:Context,private config:Dict) {
        if(!config.timeout) config.timeout=ctx.zhin.options.delay.timeout||=60*1000
        if(!config.api_key) {
            this.ctx.logger.warn('你没有添加 api key ，ChatGPT 服务将无法正常使用')
            return
        }
        this.userSessions = new Map();
        this.api = new OpenAI({
            apiKey: config.api_key,
            baseURL:config.proxy_url,
        });
    }
    hasAnswer(user_id:string,question:string){
        return this.userSessions.has(user_id) && this.userSessions.get(user_id).history.some((item)=>{
            return item.content===question
        })
    }

    private trySend<T>(question:string,history:ChatCompletionMessageParam[],callback:Callback<T>){
        return new Promise<T>(async (resolve,reject)=>{
            const dispose=this.ctx.setTimeout(()=>{
                reject(new Error('哦，原来是超时了'))
            },this.config.timeout)
            callback(resolve,reject).finally(()=>{
                dispose()
            })
        })
    }
    getHistory(user_id:string,limit:number=10){
        const session=this.userSessions.get(user_id);
        if(!session) return [];
        return session.history.slice(0,limit);
    }
    async drawImage(user_id:string,prompt:string){
        const result=await this.trySend<ImagesResponse>(prompt,this.getHistory(user_id),async (resolve,reject)=>{
            this.api.images.generate({
                prompt:prompt,
                n:1,
                size:`${this.config.img_size}x${this.config.img_size}` as any,
                response_format:'b64_json'
            }).then(res=>{
                resolve(res)
            }).catch(reject)
        });
        return result.data?.[0].b64_json
    }
    async getAnswerWithQuestion(user_id: string, question: Element.Fragment,history:ChatCompletionMessageParam[]=[]): Promise<string> {
        question=Element.stringify(question)
        if (!this.api) {
            throw new Error('你没有添加 api key ，ChatGPT 服务将无法正常使用');
        }

        let userSession = this.userSessions.get(user_id);
        if(!userSession) this.userSessions.set(user_id,userSession={history:[]})
        if(history.length>0) userSession.history.push(...history);
        while (history.length>this.config.max_history_len) history.shift();
        try{
            const { choices } = await this.trySend<ChatCompletion>(question,userSession.history,async (resolve,reject)=>{
                this.api.chat.completions.create({
                    messages:[
                        ...history,
                        {
                            role:'user',
                            content:question as string,
                        }
                    ],
                    model:'gpt-3.5-turbo'
                }).then(res=>{
                    resolve(res)
                }).catch(reject)
            });
            if(userSession.cancelFree) userSession.cancelFree()
            const result=choices[0]
            userSession.history.push(result.message)
            userSession.cancelFree=this.ctx.setTimeout(()=>{
                this.userSessions.delete(user_id)
            },1000*this.config.session_timeout)
            return result.message.content;
        }catch (e){
            const matchReasonReg=/reson:(.+)/
            if(matchReasonReg.test(e.message+'')){
                const reason=String(e.message).match(matchReasonReg)
                return `哦豁，报错了：${reason[1]}`
            }
            return `哦豁，报错了:${e.message||e}`
        }
    }

}
