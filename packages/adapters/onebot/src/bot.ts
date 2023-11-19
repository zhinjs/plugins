import {Zhin, Bot, BotOptions, Session, Element, NSession } from "zhin";
import {OneBotAdapter, OneBotEventMap} from "./";
import {OneBotPayload, Types} from './types'
import {createHttpHandler, createWebhookHandler, createWsHandler, createWsReverseHandler} from "./link";
import {Logger} from "log4js";
import {fromElement,toString} from "./utils";

declare module 'zhin' {
    namespace Zhin {
        interface Adapters {
            onebot: OneBotAdapter
        }

        interface Bots {
            onebot: OneBot
        }

        interface BotEventMaps {
            onebot: OneBotEventMap
        }
    }
}

export interface OneBot {
    sendPayload(payload: OneBotPayload): void

    stop(): void
}

export class OneBot extends Bot<
    `onebot`,
    OneBot.Options<keyof OneBotAdapter.AdapterOptions>,
    OneBotAdapter.Options, string> {
    connect_status:string= 'disconnected';
    stat = {
        start_time: 0,
        lost_times: 0,
        recv_msg_cnt: 0,
        sent_msg_cnt: 0,
        msg_cnt_per_min: 0
    }

    get logger() {
        const logReal = (level, msg, ...args) => {
            this.zhin.logger[level](`【${this.adapter.protocol}:${this.options.type}:${this.self_id}】 ${msg}`, ...args)
        }
        return {
            info(...args: Parameters<Logger['info']>) {
                return logReal('info', ...args)
            },
            mark(...args: Parameters<Logger['mark']>) {
                return logReal('mark', ...args)
            },
            debug(...args: Parameters<Logger['debug']>) {
                return logReal('debug', ...args)
            },
            warn(...args: Parameters<Logger['warn']>) {
                return logReal('warn', ...args)
            },
            error(...args: Parameters<Logger['error']>) {
                return logReal('error', ...args)
            },
        }
    }

    reconnect_times: number = 0

    constructor(public zhin: Zhin, public adapter: OneBotAdapter,options: BotOptions<OneBot.Options<keyof OneBotAdapter.AdapterOptions>>) {
        super(zhin, adapter, options);
        if ((['http', 'ws']).includes(options.type)) this.self_id = options['self_id']
    }

    isGroup(session){
        return !!session.group_id
    }
    isPrivate(session){
        return session.detail_type==='private'
    }
    isMaster(session){
        return String(this.options.master)===String(session.user_id)
    }
    isAdmins(session){
        return this.options.admins.map(String).includes(String(session.user_id))
    }
    isOwner(session){
        return !!session.is_owner
    }
    isAdmin(session){
        return !!session.is_admin
    }
    isAtMe(session){
        return !!session.atme
    }
    isOnline() {
        return this.connect_status === 'connected'
    }
    isGroupCreator(session){
        return session.group?.owner_id===session.user_id
    }
    getGroupList(){
        return this.callApi('get_group_list')
    }
    isGroupAdmin(session){
        return !!session.group?.admin_flag
    }
    createSession<E extends keyof OneBotEventMap>(event: E, ...args: Parameters<OneBotEventMap[E]>): NSession<'onebot', E> {
        let obj = typeof args[0] === "object" ? args.shift() : Object.create(null)
        if (!obj) obj = {}
        Object.assign(obj, {
            bot: this,
            protocol: 'onebot',
            adapter: this.adapter,
            event,
            is_owner:obj.sender?.role==='owner',
            is_admin:obj.sender?.role==='admin',
            user_id: obj.user_id || obj.sender?.user_id || obj.sender?.tiny_id,
            user_name: obj.nickname || obj.sender?.nickname || obj.sender?.card || obj.sender?.title,
            type: obj.post_type || event,
            detail_type: obj.message_type || obj.request_type || obj.system_type || obj.notice_type || 'guild',
        }, {args})
        if(obj.source&& typeof obj.source==="object"){
            obj.quote={
                message_id:obj.source.message_id,
                user_id:obj.source.user_id,
                content:obj.source.message
            }
            obj.message.shift()
            obj.content=toString(obj.message||'')
            delete obj.source
        }else{
            obj.content=toString(obj.message||'')
        }
        const session = new Session<"onebot">(this.adapter, this.self_id, event, obj)
        return session as any
    }

    private async runAction<T extends keyof Types.ActionMap>(action: T, params?: Parameters<Types.ActionMap[T]>[0], async?: boolean): Promise<ReturnType<Types.ActionMap[T]>> {
        return new Promise((resolve, reject) => {
            const echo = new Date().getTime()
            this.zhin.logger.debug(`[onebot:${this.self_id}] run action ${action} with echo ${echo}`, params)
            this.sendPayload({
                action: `${action}${async ? '_async' : ''}`,
                echo,
                params
            })
            const dispose = this.adapter.on('echo', (payload) => {
                if (payload.echo === echo) {
                    dispose()
                    if (payload.retcode === 0) {
                        resolve(payload.data)
                    } else {
                        reject(payload.error)
                    }
                }
            })
        })
    }

    async deleteMsg(message_id: string) {
        await this.runAction('delete_message', {message_id})
        return true
    }
    async getMsg(message_id:string){
        const result=await this.runAction('get_msg',{message_id})
        return {
            message_id,
            from_id: this.self_id,
            to_id: result['user_id']||result['group_id']||result['discuss_id']||result['channel_id'],
            type: result['detail_type'],
            user_id: this.self_id,
            content: toString(result.message),
        }
    }
    getSelfInfo(){
        return this.runAction('get_self_info')
    }
    getFriendList() {
        return this.runAction('get_friend_list')
    }

    getFriendInfo(friend_id: string) {
        return this.runAction('get_friend_info', {user_id: friend_id})
    }


    getGroupInfo(group_id: string) {
        return this.runAction('get_group_info', {group_id})
    }

    getGroupMemberList(group_id: string) {
        return this.runAction('get_group_member_list', {group_id})
    }

    getGroupMemberInfo(group_id: string, member_id) {
        return this.runAction('get_group_member_info', {group_id, member_id})
    }

    callApi<T extends keyof Types.ActionMap>(apiName: T, ...args: Parameters<Types.ActionMap[T]>) {
        return this.runAction(apiName, ...args)
    }

    async sendMsg(target_id: string | number, target_type: Bot.MessageType, message: Element.Fragment): Promise<Bot.MessageRet> {
        const types = ['private', 'group', 'discuss']
        message=Element.toElementArray(message)
        const sendMessage=await fromElement(message as Element[])
        const result = await this.runAction('send_message', {
            guild_id: types.includes(target_type) ? undefined : String(target_id),
            channel_id: types.includes(target_type) ? undefined : target_type,
            [target_type === 'private' ? 'user_id' : `${target_type}_id`]: types.includes(target_type) ? target_id : undefined,
            message:sendMessage as Types.Message
        })
        const messageRet={
            message_id: result.message_id,
            from_id: this.self_id,
            to_id: target_id,
            content: toString(sendMessage as Types.Message),
            type: target_type,
            user_id: this.self_id
        }
        this.adapter.emit('message.send',this.self_id,messageRet)
        return messageRet
    }

    start(): () => any {
        switch (this.options.type) {
            case "http": {
                return this.stop = createHttpHandler(this, this.options as OneBot.Options<'http'>)
            }
            case "webhook": {
                return this.stop = createWebhookHandler(this, this.options as OneBot.Options<'webhook'>)
            }
            case "ws": {
                return this.stop = createWsHandler(this, this.options as OneBot.Options<'ws'>)
            }
            case "ws_reverse": {
                return this.stop = createWsReverseHandler(this, this.options as OneBot.Options<'ws_reverse'>)
            }
            default:
                return this.options.type
        }
    }

}

export namespace OneBot {

    export type Options<T extends keyof OneBotAdapter.AdapterOptions> = {
        type: T
    } & OneBotAdapter.AdapterOptions[T]
}
