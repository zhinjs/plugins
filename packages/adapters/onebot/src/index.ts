import {Adapter, AdapterOptions, NSession, Zhin} from "zhin";
import {OneBot} from "./bot";
export {OneBot}
export {OneBotEventMap} from './types'
export class OneBotAdapter<T extends keyof OneBotAdapter.AdapterOptions=keyof OneBotAdapter.AdapterOptions> extends Adapter<`onebot`,OneBot.Options<T>,OneBotAdapter.Options>{
    constructor(app:Zhin, protocol, options:AdapterOptions<OneBot.Options<T>,OneBotAdapter.Options>) {
        super(app,protocol,options);
        this.on('message',(session:NSession<'onebot'>)=>{
            this.emit('message.receive',session.bot.self_id,session)
        })
    }
    async start(){
        for(const botOptions of this.options.bots){
            this.startBot(botOptions)
        }
    }
}
export namespace OneBotAdapter{
    export type AdapterOptions={
        http:{
            self_id:string
            url:string
            access_token?:string
            get_events_interval:number
            events_buffer_size?:number
            timeout?:number
        }
        webhook:{
            path:string
            get_actions_path:string
            access_token?:string
            timeout?:number
        }
        ws:{
            self_id:string
            url:string
            reconnect_interval?:number
            max_reconnect_times?:number
            access_token?:string
        }
        ws_reverse:{
            self_id:string
            path:string
            access_token?:string
        }
    }
    export interface Options{
        access_token?:string
    }
}
Adapter.define('onebot',OneBotAdapter,OneBot)
