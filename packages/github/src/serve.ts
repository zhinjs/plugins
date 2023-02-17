import {Context, Dict, Session, h, Schema} from "zhin";
import {DataTypes} from "sequelize";
import { Method } from 'axios'
import {Request} from "@zhinjs/plugin-utils";
import {GithubTable} from "./models/github";
import {EventConfig} from './events'
export type ReplyPayloads = {
    [K in keyof ReplyHandler]?: ReplyHandler[K] extends (...args: infer P) => any ? P : never
}
declare module '@zhinjs/plugin-database'{
    namespace UserTable{
        interface Types{
            github_accessToken: string
            github_refreshToken: string
        }
    }
    namespace GroupTable{
        interface Types{
            github_webhooks:Dict<EventConfig>
        }
    }
}
export type EventData<T = {}> = [string, (ReplyPayloads & T)?]
export interface OAuth {
    access_token: string
    expires_in: string
    refresh_token: string
    refresh_token_expires_in: string
    token_type: string
    scope: string
}
declare module '@zhinjs/plugin-database'{
    namespace GroupTable{
        interface Types{
            github_webhooks:Dict<EventConfig>
        }
    }
    namespace UserTable{
        interface Types{
            github_accessToken:string
            github_refreshToken:string
        }
    }
}
export class GitHub{
    public history: Dict<ReplyPayloads> = Object.create(null)
    private http: Request
    constructor(public ctx:Context,public config:Config) {
        this.http=ctx.axios.extend({})
        if(ctx.database){
            this.init()
        }
        ctx.disposes.push(this.ctx.app.on('database-created',()=>{
            this.init()
        }))
    }
    init(){
        this.ctx.database.extend('User',{
            github_accessToken:DataTypes.STRING,
            github_refreshToken:DataTypes.STRING
        })
        this.ctx.database.extend('Group',{
            github_webhooks:{
                type:DataTypes.TEXT,
                get():Dict<EventConfig> {
                    return JSON.parse(this.getDataValue('github_webhooks')||'{}')
                },
                set(value:Dict<EventConfig>){
                    this.setDataValue('github_webhooks',JSON.stringify(value))
                }
            }

        })
        this.ctx.database.define('github',GithubTable.model)
    }
    async getTokens(params: any) {
        return this.http.post<OAuth>('https://github.com/login/oauth/access_token', {}, {
            params: {
                client_id: this.config.appId,
                client_secret: this.config.appSecret,
                ...params,
            },
            headers: { Accept: 'application/json' },
            timeout: this.config.requestTimeout,
        })
    }
    private async _request(method: Method, url: string, replyMsg: Session, data?: any, headers?: Dict) {
        this.ctx.logger.debug(method, url, data)
        return this.http(method, url, {
            data,
            headers: {
                accept: 'application/vnd.github.v3+json',
                authorization: `token ${replyMsg.user.github_accessToken}`,
                ...headers,
            },
            timeout: this.config.requestTimeout,
        })
    }
    async authorize(session: Session, message: string) {
        const name = await session.prompt.text(message)
        if (name) {
            await session.execute({ name: 'github.authorize',session:session as any, args: [name] })
        } else {
            await session.reply('输入超时')
        }
    }
    async request(method: Method, url: string, session:Session, body?: any, headers?: Dict) {
        if(session.detail_type!=='group') return '只能在群聊中使用'
        if (!session.user.github_accessToken) {
            return this.authorize(session, '要使用此功能，请对机器人进行授权。输入你的 GitHub 用户名。')
        }

        try {
            return await this._request(method, url, session, body, headers)
        } catch (error) {
            if (error.response?.status !== 401) throw error
        }

        try {
            const data = await this.getTokens({
                refresh_token: session.user.github_refreshToken,
                grant_type: 'refresh_token',
            })
            session.user.github_accessToken = data.access_token
            session.user.github_refreshToken = data.refresh_token
        } catch {
            return this.authorize(session, '令牌已失效，需要重新授权。输入你的 GitHub 用户名。')
        }

        return await this._request(method, url, session, body, headers)
    }
}
export interface Config {
    path?: string
    appId?: string
    appSecret?: string
    messagePrefix?: string
    redirect?: string
    promptTimeout?: number
    replyTimeout?: number
    requestTimeout?: number
}
export const Config=Schema.object({
    path:Schema.string().description('webhook路径').default('/github'),
    appId:Schema.string().description('Github AppId').required(true),
    appSecret:Schema.string().description('Github AppSecret').required(true),
    messagePrefix:Schema.string().description('消息前缀'),
    redirect:Schema.string().description('请求回调地址').default('/redirect'),
    promptTimeout:Schema.string().description('会话超时时间'),
    replyTimeout:Schema.string().description('回复超时时间'),
    requestTimeout:Schema.string().description('请求超时时间'),
})
export class ReplyHandler {
    constructor(public github: GitHub, public ctxEvent: Session, public content?: string) {}

    async request(method: Method, url: string, message: string, body?: any, headers?: Dict) {
        try {
            await this.github.request(method, url, this.ctxEvent, body, headers)
        } catch (err) {
            return message
        }
    }

    link(url: string) {
        return url
    }

    react(url: string) {
        return this.request('POST', url,'发送失败', {
            content: this.content,
        }, {
            accept: 'application/vnd.github.squirrel-girl-preview',
        })
    }

    async transform(source: string) {
        const [{type,attrs:{url,text}}]=h.parse(source)
        return type!=='image'?text:`![${text}](${url})`
    }

    async reply(url: string, params?: Dict) {
        return this.request('POST', url, '发送失败', {
            body: await this.transform(this.content),
            ...params,
        })
    }

    base(url: string) {
        return this.request('PATCH', url, '修改失败', {
            base: this.content,
        })
    }

    merge(url: string, method?: 'merge' | 'squash' | 'rebase') {
        const [title] = this.content.split('\n', 1)
        const message = this.content.slice(title.length)
        return this.request('PUT', url, '操作失败。', {
            merge_method: method,
            commit_title: title.trim(),
            commit_message: message.trim(),
        })
    }

    rebase(url: string) {
        return this.merge(url, 'rebase')
    }

    squash(url: string) {
        return this.merge(url, 'squash')
    }

    async close(url: string, commentUrl: string) {
        if (this.content) await this.reply(commentUrl)
        await this.request('PATCH', url, '操作失败', {
            state: 'closed',
        })
    }

}