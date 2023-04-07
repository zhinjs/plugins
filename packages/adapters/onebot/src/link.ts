import {WebSocket} from "ws";
import axios from "axios";
import {OneBot} from "./bot";
import {OneBotPayload} from "./types";
import {getReqIp} from "zhin";

export function createHttpHandler(bot: OneBot, options: OneBot.Options<'http'>) {
    const request = axios.create({
        baseURL: options.url,
        timeout: options.timeout || 60000
    })
    if (options.access_token) {
        request.interceptors.request.use((config) => {
            config.headers['Authorization'] = `Bearer ${options.access_token}`
            return config
        })
    }
    const cachedEvent: number[] = []
    bot.sendPayload = function (payload) {
        return new Promise(resolve => {
            request.post(payload.action, payload.params).then(res => {
                if (res.status === 200) {
                    bot.logger.debug(`发送动作（${payload.action}）成功`)
                    request.post(payload.action, payload.params)
                    resolve(res.data)
                } else if (res.status === 401) {
                    bot.logger.error(`鉴权失败`)
                } else {
                    bot.logger.error(`预期之外的错误码：`, res.status)
                }
            })
        })
    }
    const dispose = bot.zhin.setInterval(() => {
        request.get('/get_latest_events').then(res => {
            if (res.status === 200) {
                const events = res.data.data || []
                for (const event of events.filter(event => !cachedEvent.includes(event.time))) {
                    bot.logger.debug(`收到事件:${JSON.stringify(event)}`)
                    if (event.echo) {
                        bot.adapter.dispatch('echo', event)
                    } else {
                        bot.adapter.dispatch(event.type, bot.createSession(event.type, event))
                    }
                    cachedEvent.push(event.time)
                    if (cachedEvent.length > (options.events_buffer_size || 20)) {
                        cachedEvent.shift()
                    }
                }
            } else if (res.status === 401) {
                bot.logger.error(`鉴权失败`)
            } else {
                bot.logger.error(`预期之外的错误码：`, res.status)
            }
        }).catch(e => {
            bot.logger.error(`无法获取最新事件，请确认协议端是否支持该API`)
        })
    }, options.get_events_interval)
    return () => {
        dispose()
        bot.sendPayload = () => {
        }
    }
}

export function createWebhookHandler(bot: OneBot, options: OneBot.Options<'webhook'>) {
    let history: OneBotPayload[] = []
    const hookRoute = bot.zhin.router.post(options.path, (ctx) => {
        if (options.access_token && ctx.headers['authorization'] !== `Bearer ${options.access_token}`) {
            ctx.res.writeHead(401).end('鉴权失败')
            return bot.logger.error(`鉴权失败`)
        }
        const event = ctx.request.body
        if (event) {
            bot.logger.debug(`收到事件:${JSON.stringify(event)}`)
            bot.self_id = event.self_id
            if (event.echo) {
                bot.adapter.dispatch('echo', event)
            } else {
                bot.adapter.dispatch(event.type, bot.createSession(event.type, event))
            }
        }
        ctx.res.writeHead(200).end()
    })
    const actionsRoute = bot.zhin.router.get(options.path + options.get_actions_path, (ctx) => {
        ctx.body = JSON.stringify(history)
        bot.logger.debug(`发送动作队列成功`)
        history = []
    })
    bot.sendPayload = function (payload) {
        history.push(payload)
    }
    return () => {
        bot.zhin.router.destroy(hookRoute)
        bot.zhin.router.destroy(actionsRoute)
        bot.sendPayload = () => {
        }
    }
}

export function createWsHandler(bot: OneBot, options: OneBot.Options<'ws'>) {
    let {reconnect_interval = 1000 * 60, max_reconnect_times = 10} = options
    const socket = new WebSocket(options.url, {
        headers: {
            ['Authorization']: `Bearer ${options.access_token}`
        }
    })
    socket.on('open', () => {
        bot.logger.info(`已连接到协议端：(${options.url})`)
    })
    socket.on('close', (code, reason) => {
        bot.logger.info(`与协议端(${options.url})断开连接`)
        bot.logger.debug(`code:${code},reason:${reason.toString('utf8')}`)
        if (bot.reconnect_times < max_reconnect_times) {
            bot.logger.info(`将在${reconnect_interval / 1000}秒后重连...`)
            bot.reconnect_times++
            bot.zhin.setTimeout(() => {
                bot.logger.info(`第${bot.reconnect_times}此重连`)
                bot.stop = createWsHandler(bot, options)
            }, reconnect_interval)
        }
    })
    socket.on('message', (data) => {
        const event = JSON.parse(data.toString())
        if (event) {
            if (!['heartbeat', 'status_update', 'connect'].includes(event.detail_type)) {
                bot.logger.debug('receive:', JSON.stringify(event))
                if (event.type === 'message') {
                    bot.logger.info(`receive:${JSON.stringify(event.message)}`)
                }
            }
            if (event.echo) {
                bot.adapter.dispatch('echo', event)
            } else {
                bot.adapter.dispatch(event.type, bot.createSession(event.type, event))
            }
        }
    })
    bot.sendPayload = function (payload) {
        const data = JSON.stringify(payload)
        bot.logger.info('send:', data)
        socket.send(data)
    }
    return () => {
        socket.close()
        bot.sendPayload = () => {
        }
    }
}

export function createWsReverseHandler(bot: OneBot, options: OneBot.Options<'ws_reverse'>) {
    const socketServer = bot.zhin.router.ws(options.path, {
        verifyClient: (info) => {
            if (!info.req.headers["sec-websocket-protocol"].startsWith('12')) {
                bot.adapter.logger.error('连接的协议不是有效的OneBotV12协议')
                return false
            }
            if (options.access_token && info.req.headers['authorization'] !== `Bearer ${options.access_token}`) {
                bot.adapter.logger.error('认证失败')
                return false
            }
            return true
        }
    })
    const wss: Set<WebSocket> = new Set<WebSocket>()
    socketServer.on('connection', (ws, req) => {
        wss.add(ws)
        bot.logger.info(`已连接到协议端：(${getReqIp(req)})`)
        ws.on('message', (data) => {
            const event = JSON.parse(data.toString())
            if (!['heartbeat', 'status_update', 'connect'].includes(event.detail_type)) {
                bot.logger.debug('receive:', JSON.stringify(event))
                bot.self_id = event.self_id
                if (event.type === 'message') {
                    bot.logger.info(`receive:${JSON.stringify(event.message)}`)
                }
            }
            if (event.echo) {
                bot.adapter.dispatch('echo', event)
            } else {
                bot.adapter.dispatch(event.type, bot.createSession(event.type, event))
            }
        })
        ws.on("error", (err) => {
            bot.logger.error(`协议端(${getReqIp(req)})报错`, err)
        })
        ws.on('close', (e) => {
            bot.logger.error(`与协议端(${getReqIp(req)})断开连接`)
            wss.delete(ws)
        })
    })
    socketServer.on("error", (err) => {
        bot.logger.error('连接报错：', err)
    })
    bot.sendPayload = function (payload) {
        const data = JSON.stringify(payload)
        bot.logger.info('send:', data)
        for (const ws of wss) {
            ws.send(data)
        }
    }
    return () => {
        socketServer.close()
        bot.sendPayload = () => {
        }
    }
}
