import { Console } from '@zhinjs/plugin-console'
import {Dict} from 'zhin'
import { App, Component, defineComponent, h, markRaw, reactive, ref, Ref, resolveComponent, watch } from 'vue'
import {createRouter, createWebHistory, RouteRecordNormalized, START_LOCATION} from 'vue-router'
import { config, Store, store } from './data'
import {ElMessage} from "element-plus";

export * from './data'

export type Computed<T> = T | (() => T)

export interface ViewOptions {
    id?: string
    type: string
    order?: number
    component: Component
}

export interface PageExtension {
    name: string
    fields?: (keyof Console.Services)[]
    badge?: () => number
}
export function pick<T, K extends keyof T>(source: T, keys?: Iterable<K>, forced?: boolean) {
    if (!keys) return { ...source }
    const result = {} as Pick<T, K>
    for (const key of keys) {
        if (forced || key in source) result[key] = source[key]
    }
    return result
}

export function omit<T, K extends keyof T>(source: T, keys?: Iterable<K>) {
    if (!keys) return { ...source }
    const result = { ...source } as Omit<T, K>
    for (const key of keys) {
        Reflect.deleteProperty(result, key)
    }
    return result
}
export interface ToolkitOptions{
    id?:string
    order?:number
    component:Component,
    icon?:string
    name:string,
    badge?:()=>number
}
interface RouteMetaExtension {
    icon?: string
    order?: number
    authority?: number
    position?: Computed<'top' | 'left' | 'hidden'>
}

export interface PageOptions extends RouteMetaExtension, PageExtension {
    path: string
    component: Component
}

declare module 'vue-router' {
    interface RouteMeta extends RouteMetaExtension {
        fields?: (keyof Console.Services)[]
        badge?: (() => number)[]
    }
}

export const views = reactive<Record<string, ViewOptions[]>>({})
export const toolkits=reactive<ToolkitOptions[]>([])
export const router = createRouter({
    history: createWebHistory(config.uiPath),
    linkActiveClass: 'active',
    routes: [],
})

export const extensions = reactive<Record<string, ZhinWeb>>({})

export const routes: Ref<RouteRecordNormalized[]> = ref([])

export type Disposable = () => void
export type Extension = (client: ZhinWeb) => void

interface DisposableExtension extends PageExtension {
    web: ZhinWeb
}

export function getValue<T>(computed: Computed<T>): T {
    return typeof computed === 'function' ? (computed as any)() : computed
}

export class ZhinWeb {
    static app: App
    static pending: Dict<DisposableExtension[]> = {}

    public disposables: Disposable[] = []

    addView(options: ViewOptions) {
        options.order ??= 0
        options.id ??= Math.random().toString(36).slice(2)
        const list = views[options.type] ||= []
        const index = list.findIndex(a => a.order < options.order)
        markRaw(options.component)
        if (index >= 0) {
            list.splice(index, 0, options)
        } else {
            list.push(options)
        }
        this.disposables.push(() => {
            const index = list.findIndex(item => item.id === options.id)
            if (index >= 0) list.splice(index, 1)
        })
    }
    addToolkit(options:ToolkitOptions){
        options.component=markRaw(options.component)
        toolkits.push(options)
        this.disposables.push(()=>{
            const index = toolkits.findIndex(item=>item===options)
            if(index>=0){
                toolkits.splice(index,1)
            }
        })
    }
    addPage(options: PageOptions) {
        const { path, name, component, badge, ...rest } = options
        const dispose = router.addRoute({
            path,
            name,
            component,
            meta: {
                order: 0,
                authority: 0,
                position: typeof options.position==='function'?options.position:options.position||'left',
                fields: [],
                badge: badge ? [badge] : [],
                ...rest,
            },
        })
        routes.value = router.getRoutes()
        this.disposables.push(() => {
            dispose()
            routes.value = router.getRoutes()
        })
        const route = routes.value.find(r => r.name === name)
        for (const options of ZhinWeb.pending[name] || []) {
            this.mergeMeta(route, options)
        }
    }

    private mergeMeta(route: RouteRecordNormalized, options: DisposableExtension) {
        const { web, fields, badge } = options
        if (fields) route.meta.fields.push(...fields)
        if (badge) route.meta.badge.push(badge)
        web.disposables.push(() => {
            const index = route.meta.badge.indexOf(badge)
            if (index >= 0) route.meta.badge.splice(index, 1)
        })
    }

    extendsPage(options: PageExtension): void
    extendsPage(options: DisposableExtension) {
        const { name } = options
        options.web = this
        const route = router.getRoutes().find(r => r.name === name)
        if (route) {
            this.mergeMeta(route, options)
        } else {
            (ZhinWeb.pending[name] ||= []).push(options)
        }
    }

    install(extension: Extension) {
        extension(this)
    }

    dispose() {
        this.disposables.forEach(dispose => dispose())
    }
}

export const root = new ZhinWeb()
export const message=ElMessage
export function defineExtension(callback: Extension) {
    return callback
}

async function loadExtension(path: string) {
    if (extensions[path]) return
    extensions[path] = new ZhinWeb()

    if (path.endsWith('.css')) {
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = path
        document.head.appendChild(link)
        extensions[path].disposables.push(() => {
            document.head.removeChild(link)
        })
        return
    }

    const exports = await import(/* @vite-ignore */ path)
    exports.default?.(extensions[path])

    const { redirect } = router.currentRoute.value.query
    if (typeof redirect === 'string') {
        const location = router.resolve(redirect)
        if (location.matched.length) {
            router.replace(location)
        }
    }
}

const initTask = new Promise<void>((resolve) => {
    watch(() => store.web, async (newValue, oldValue) => {
        newValue ||= []
        for (const path in extensions) {
            if (newValue.includes(path)) continue
            extensions[path].dispose()
            delete extensions[path]
        }
        await Promise.all(newValue.map((path) => {
            return loadExtension(path).catch(console.error)
        }))

        if (!oldValue) resolve()
    }, { deep: true })
})

router.beforeEach(async (to, from) => {
    if (to.matched.length) return

    if (from === START_LOCATION) {
        await initTask
        to = router.resolve(to)
        if (to.matched.length) return to
    }

    const routes = router.getRoutes()
        .filter(item => item.meta.position === 'left')
        .sort((a, b) => b.meta.order - a.meta.order)
    const path = routes[0]?.path || '/blank'
    return {
        path,
        query: { redirect: to.fullPath },
    }
})

// component helper

export namespace Card {
    export function create(render: Function, fields: readonly (keyof Console.Services)[] = []) {
        return defineComponent({
            render: () => fields.every(key => store[key]) ? render() : null,
        })
    }

    export interface NumericOptions {
        icon: string
        title: string
        type?: string
        fields?: (keyof Console.Services)[]
        content: (store: Store) => any
    }

    export function numeric({ type, icon, fields, title, content }: NumericOptions) {
        const render = type ? () => h(resolveComponent('k-numeric'), {
            icon, title, type, value: content(store), fallback: '未安装',
        }) : () => h(resolveComponent('k-numeric'), {
            icon, title,
        }, () => content(store))
        return create(render, fields)
    }
}
