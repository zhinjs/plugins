import {Context, Dict} from "zhin";
import {DataService,Console} from "@zhinjs/plugin-console";
import path from "path";
import {MockAdapter} from "./adapter";
declare module 'zhin'{
    namespace Zhin{
        interface Adapters {
            mock:MockAdapter
        }
    }
    interface EventMap{
        'mock/response'(nonce: string, data: any): void
    }
}
export interface Message {
    id: string
    user_id: string
    group_id?: string
    content: string
    platform: string
    quote?: Message
}
declare module '@zhinjs/plugin-console' {
    interface Events{
        'mock/response'(this: Console, nonce: string, data?: any): void
        'mock/send-message'(this: Console,user_id: string, group_id: string, content: string, quote?: Message): void
        'mock/delete-message'(this: Console, user_id: string, group_id: string, message_id: string): void
    }
}
export function install(ctx:Context){
    ctx.adapter(MockAdapter)
    ctx.console.addEntry({
        prod:path.resolve(__dirname,'../client/index.ts'),
        dev:path.resolve(__dirname,'../dist')
    })
    ctx.console.addListener('mock/send-message',async (
        user_id,
        group_id,
        content
    )=>{

    })
}
