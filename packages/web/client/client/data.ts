import { ClientConfig, Console, DataService, Events,Methods } from '@zhinjs/plugin-console'
import { reactive, ref } from 'vue'
import { useLocalStorage } from '@vueuse/core'

interface StorageData<T> {
    version: number
    data: T
}

export function createStorage<T extends object>(key: string, version: number, fallback?: () => T) {
    const storage = useLocalStorage('zhin.console.' + key, {} as StorageData<T>)
    const initial = fallback ? fallback() : {} as T
    if (storage.value['version'] !== version) {
        storage.value = { version, data: initial }
    } else {
        storage.value.data = { ...initial, ...storage.value.data }
    }
    return reactive<T>(storage.value['data'])
}

export type Store = {
    [K in keyof Console.Services]?: Console.Services[K] extends DataService<infer T> ? T : never
}

declare const zhin_config: ClientConfig
export const config=zhin_config
export const store = reactive<Store>({})

export const socket = ref<WebSocket>(null)
const listeners: Record<string, (data: any) => void> = {}
const responseHooks: Record<string, [Function, Function]> = {}

export function send<T extends keyof Events>(type: T, ...args: Parameters<Events[T]>): Promise<ReturnType<Events[T]>>
export function send(type: string, ...args: any[]) {
    if (!socket.value) return Promise.resolve()
    const id = Math.random().toString(36).slice(2, 9)
    socket.value.send(JSON.stringify({ id, type, args }))
    return new Promise((resolve, reject) => {
        responseHooks[id] = [resolve, reject]
        setTimeout(() => {
            delete responseHooks[id]
            reject(new Error('timeout'))
        }, 60000)
    })
}
export function call<T extends keyof Methods>(method: T, ...args: Parameters<Methods[T]>) {
    return send(method, ...args)
}
export function receive<T = any>(event: string, listener: (data: T) => void) {
    listeners[event] = listener
}

receive('data', ({ key, value }) => {
    store[key] = value
})

receive('patch', ({ key, value }) => {
    if (Array.isArray(store[key])) {
        store[key].push(...value)
    } else {
        Object.assign(store[key], value)
    }
})

receive('response', ({ id, value, error }) => {
    if (!responseHooks[id]) return
    const [resolve, reject] = responseHooks[id]
    delete responseHooks[id]
    if (error) {
        reject(error)
    } else {
        resolve(value)
    }
})

export async function connect(endpoint: string) {
    socket.value = new WebSocket(endpoint)

    socket.value.onmessage = (ev) => {
        const data = JSON.parse(ev.data)
        if (data.type in listeners) {
            listeners[data.type](data.body)
        }
    }

    socket.value.onclose = (ev) => {
        socket.value = null
        for (const key in store) {
            store[key] = undefined
        }
        console.log('[zhin] websocket disconnected, will retry in 1s...')
        setTimeout(() => connect(endpoint), 1000)
    }

    return new Promise((resolve) => {
        socket.value.onopen = resolve
    })
}
