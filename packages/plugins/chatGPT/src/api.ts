import ExpiryMap from 'expiry-map'
import internal, { Writable } from 'stream'
import {createParser} from 'eventsource-parser'
import { v4 as uuidv4 } from 'uuid'
import {Context, Dict, Request, Schema} from "zhin";
import * as types from './types'
export interface Conversation {
    conversationId?: string
    messageId?: string
    message: string
}
const KEY_ACCESS_TOKEN = 'accessToken'
class ChatGPT {
    protected http: Request
    // stores access tokens for up to 10 seconds before needing to refresh
    protected _accessTokenCache = new ExpiryMap<string, string>(10 * 1000)

    constructor(ctx: Context,public config:ChatGPT.Config) {
        this.http = ctx.request.extend(config)
    }

    async getIsAuthenticated() {
        try {
            await this.refreshAccessToken()
            return true
        } catch (err) {
            return false
        }
    }

    async ensureAuth() {
        return await this.refreshAccessToken()
    }

    async sendMessage(conversation: Conversation): Promise<Required<Conversation>> {
        const { conversationId, messageId = uuidv4(), message } = conversation

        const accessToken = await this.refreshAccessToken()

        const body: types.ConversationJSONBody = {
            action: 'next',
            conversation_id: conversationId,
            messages: [
                {
                    id: uuidv4(),
                    role: 'user',
                    content: {
                        content_type: 'text',
                        parts: [message],
                    },
                },
            ],
            model: 'text-davinci-002-render',
            parent_message_id: messageId,
        }

        let data: internal.Readable
        try {
            const resp = await this.http.axios<internal.Readable>('/backend-api/conversation', {
                method: 'POST',
                responseType: 'stream',
                data: body,
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    cookie: `cf_clearance=${this.config.cloudflareToken};__Secure-next-auth.session-token=${this.config.sessionToken}`,
                    referer: 'https://chat.openai.com/chat',
                    authority: 'chat.openai.com',
                },
            })

            data = resp.data
        } catch (err) {
            switch (err.response?.status) {
                case 401:
                    throw new Error('未授权')
                case 404:
                    throw new Error('未找到')
                case 429:
                    throw new Error('请求过多')
                case 500:
                case 503:
                    throw new Error('服务不可用')
                default:
                    throw err
            }
        }

        let response = ''
        return await new Promise<Required<Conversation>>((resolve, reject) => {
            let messageId: string
            let conversationId: string
            const parser = createParser((event) => {
                if (event.type === 'event') {
                    const { data } = event
                    if (data === '[DONE]') {
                        return resolve({ message: response, messageId, conversationId })
                    }
                    try {
                        const parsedData: types.ConversationResponseEvent = JSON.parse(data)
                        const message = parsedData.message
                        conversationId = parsedData.conversation_id

                        if (message) {
                            messageId = message?.id
                            let text = message?.content?.parts?.[0]

                            if (text) {
                                response = text
                            }
                        }
                    } catch (err) {
                        reject(err)
                    }
                }
            })
            data.pipe(new Writable({
                write(chunk: string | Buffer, _encoding, cb) {
                    parser.feed(chunk.toString())
                    cb()
                },
            }))
        })
    }

    async refreshAccessToken(): Promise<string> {
        const cachedAccessToken = this._accessTokenCache.get(KEY_ACCESS_TOKEN)
        if (cachedAccessToken) {
            return cachedAccessToken
        }

        try {
            const res = await this.http.get('/api/auth/session', {
                headers: {
                    cookie: `cf_clearance=${this.config.cloudflareToken};__Secure-next-auth.session-token=${this.config.sessionToken}`,
                    referer: 'https://chat.openai.com/chat',
                    authority: 'chat.openai.com',
                },
            })

            const accessToken = res?.accessToken

            if (!accessToken) {
                console.warn('no auth token', res)
                throw new Error('Unauthorized')
            }

            this._accessTokenCache.set(KEY_ACCESS_TOKEN, accessToken)
            return accessToken
        } catch (err: any) {
            throw new Error(`ChatGPT failed to refresh auth token: ${err.toString()}`)
        }
    }
}
namespace ChatGPT{
    export interface Config{
        sessionToken: string
        cloudflareToken: string
        endpoint: string
        headers?: Dict<string>
        proxyAgent?: string
    }
    export const Config: Schema<Config> = Schema.object({
        sessionToken: Schema.string().role('secret').description('ChatGPT 会话令牌。').required(),
        cloudflareToken: Schema.string().role('secret').description('Cloudflare 令牌。').required(),
        endpoint: Schema.string().description('ChatGPT API 的地址。').default('https://chat.openai.com'),
        headers: Schema.dict(String).description('要附加的额外请求头。').default({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
        }),
        proxyAgent: Schema.string().role('link').description('使用的代理服务器地址。'),
        markdown: Schema.boolean().hidden().default(false),
    }).description('登录设置')
}
export default ChatGPT