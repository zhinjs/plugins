import {Zhin, Bot, BotOptions, Session, Element, NSession} from "zhin";
import {OneBotAdapter, OneBotEventMap} from "./";
import {OneBotPayload, Types} from './types'
import {createHttpHandler, createWebhookHandler, createWsHandler, createWsReverseHandler} from "./link";
import {Logger} from "log4js";
import {fromFragment,toElement} from "./utils";
declare module 'zhin'{
    namespace Zhin{
        interface Adapters{
            oneBot:OneBotAdapter
        }
        interface Bots{
            oneBot:OneBot
        }
        interface BotEventMaps{
            oneBot:OneBotEventMap
        }
    }
}
export interface OneBot{
    sendPayload(payload:OneBotPayload):void
    stop():void
}
export class OneBot extends Bot<
    `oneBot`,
    OneBot.Options<keyof OneBotAdapter.AdapterOptions>,
    OneBotAdapter.Options, string>{
    stat={
        start_time:0,
        lost_times:0,
        recv_msg_cnt: 0,
        sent_msg_cnt: 0,
        msg_cnt_per_min:0
    }
    logger:Logger
    reconnect_times:number=0
    constructor(public zhin:Zhin, public adapter:OneBotAdapter, public options:BotOptions<OneBot.Options<keyof OneBotAdapter.AdapterOptions>>) {
        super(zhin,adapter,options);
        if((['http','ws']).includes(options.type)) this.self_id=options['self_id']
        this.logger=this.adapter.getLogger(options.type)
    }
    isOnline(){
        return true
    }

    createSession<E extends keyof OneBotEventMap>(event: E, ...args: Parameters<OneBotEventMap[E]>): NSession<'oneBot',E> {
        let obj = typeof args[0] === "object" ? args.shift() : Object.create(null)
        if(!obj) obj={}
        Object.assign(obj, {
            bot: this,
            protocol: 'oneBot',
            adapter: this.adapter,
            event,
            user_id:obj.user_id||obj.sender?.user_id||obj.sender?.tiny_id,
            user_name:obj.nickname||obj.sender?.nickname||obj.sender?.card||obj.sender?.title,
            type: obj.post_type||event,
            detail_type: obj.message_type || obj.request_type || obj.system_type || obj.notice_type||'guild',
        }, {args})
        const session=new Session<"oneBot">(this.adapter, this.self_id, event, obj)
        session.elements=toElement(obj.message)
        return session as any
    }
    private async runAction<T extends keyof Types.ActionMap>(action:T,params?:Parameters<Types.ActionMap[T]>[0],async?:boolean):Promise<ReturnType<Types.ActionMap[T]>>{
        return new Promise((resolve,reject) => {
            const echo=new Date().getTime()
            this.sendPayload({
                action:`${action}${async?'_async':''}`,
                echo,
                params
            })
            const dispose=this.adapter.on('echo',(payload)=>{
                if(payload.echo===echo){
                    dispose()
                    if(payload.retcode===20){
                        resolve(payload.data)
                    }else{
                        reject(payload.error)
                    }
                }
            })
        })
    }
    async deleteMsg(message_id:string){
        await this.runAction('delete_message',{message_id})
        return true
    }
    getFriendList(){
        return this.runAction('get_friend_list')
    }
    getFriendInfo(friend_id:string){
        return this.runAction('get_friend_info',{user_id:friend_id})
    }
    getGroupList(){
        return this.runAction('get_group_list')
    }
    getGroupInfo(group_id:string){
        return this.runAction('get_group_info',{group_id})
    }
    getGroupMemberList(group_id:string){
        return this.runAction('get_group_member_list',{group_id})
    }
    getGroupMemberInfo(group_id:string,member_id){
        return this.runAction('get_group_member_info',{group_id,member_id})
    }
    callApi<T extends keyof Types.ActionMap>(apiName:T,...args:Parameters<Types.ActionMap[T]>){
        return this.runAction(apiName,...args)
    }
    async sendMsg(target_id:string|number,target_type:Bot.MessageType,message:Element.Fragment):Promise<Bot.MessageRet>{
        const types= ['private','group','discuss']
        if(!Array.isArray(message))message=[message]
        const result= await this.runAction('send_message',{
            guild_id:types.includes(target_type)?undefined:String(target_id),
            channel_id:types.includes(target_type)?undefined:target_type,
            [target_type==='private'?'user_id':`${target_type}_id`]:types.includes(target_type)?target_id:undefined,
            message:fromFragment(message)
        })
        return {
            message_id:result.message_id,
            from_id:this.self_id,
            to_id:target_id,
            elements: Element.toElementArray(message),
            type:target_type,
            user_id:this.self_id
        }
    }

    start():()=>any {
        switch (this.options.type){
            case "http":{
                return this.stop=createHttpHandler(this,this.options as OneBot.Options<'http'>)
            }
            case "webhook":{
                return this.stop=createWebhookHandler(this,this.options as OneBot.Options<'webhook'>)
            }
            case "ws":{
                return this.stop=createWsHandler(this,this.options as OneBot.Options<'ws'>)
            }
            case "ws_reverse":{
                return this.stop=createWsReverseHandler(this,this.options as OneBot.Options<'ws_reverse'>)
            }
            default:
                return this.options.type
        }
    }

}
export namespace OneBot{

    export type Options<T extends keyof OneBotAdapter.AdapterOptions>= {
        type:T
    } & OneBotAdapter.AdapterOptions[T]
}
