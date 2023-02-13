import {Awaitable, Plugin, Dict, Context} from 'zhin'
import { v4 } from 'uuid'
import {WebSocket,WebSocketServer} from 'ws'
import { DataService } from './service'
export class SocketHandle {
    readonly ctx: Context
    readonly id: string = v4()

    constructor(service: WsService, public socket: WebSocket) {
        this.ctx = service.ctx
        this.refresh()
    }

    send(payload: any) {
        this.socket.send(JSON.stringify(payload))
    }

    refresh() {
        Object.keys(this.ctx['services']).forEach(async (name) => {
            const service = this.ctx[name] as DataService
            if (!name.startsWith('console.') || !service) return
            const key = name.slice(8)
            const value = await service.get()
            if (!value) return
            this.send({ type: 'data', body: { key, value } })
        })
    }
}

export interface Listener extends DataService.Options {
    callback: Listener.Callback
}

export namespace Listener {
    export type Callback = (this: SocketHandle, ...args: any[]) => Awaitable<any>
}

class WsService extends DataService {
    readonly handles: Dict<SocketHandle> = {}
    readonly listeners: Dict<Listener> = {}
    readonly layer: WebSocketServer

    constructor(public plugin:Plugin,bot: Context, private config: WsService.Config) {
        super(bot, 'ws')

        this.layer = bot.router.ws('/'+config.apiPath)
        this.layer.on('connection',this.onConnection)
    }

    broadcast(type: string, body: any, options: DataService.Options = {}) {
        const handles = Object.values(this.handles)
        if (!handles.length) return
        const data = JSON.stringify({ type, body })
        Promise.all(Object.values(this.handles).map(async (handle) => {
            handle.socket.send(data)
        }))
    }

    addListener(event: string, listener: Listener) {
        this.listeners[event] = listener
    }

    stop() {
        this.layer.close()
    }

    private onConnection = (socket: WebSocket) => {
        const handle = new SocketHandle(this, socket)
        this.handles[handle.id] = handle
        socket.on('message', async (data) => {
            const { type, args, id } = JSON.parse(data.toString())
            const listener = this.listeners[type]
            if (!listener) {
                return handle.send({ type: 'response', body: { id, error: 'not implemented' } })
            }
            try {
                const value = await listener.callback.call(handle, ...args)
                return handle.send({ type: 'response', body: { id, value } })
            } catch (e) {
                return handle.send({ type: 'response', body: { id, error: e.message } })
            }
        })
    }
}

namespace WsService {
    export interface Config {
        selfUrl?: string
        apiPath?: string
    }
}

export default WsService
