import {Adapter, Zhin, Bot, BotOptions, Plugin, Element, AdapterOptions, NSession} from "zhin";
import {EventEmitter} from "events";
declare module 'zhin'{
    namespace Zhin{
        interface Adapters{
            mock:MockAdapter
        }
        interface Bots{
            mock:MockBot
        }
    }
}
export class MockAdapter extends Adapter<'mock'>{
    constructor(app:Zhin,platform:'mock',options:AdapterOptions) {
        super(app,platform,options);
    }
}
export class MockBot extends EventEmitter implements Bot<'mock'>{
    adapter: Adapter<"mock">;
    app: Zhin;
    options: BotOptions;
    self_id: number;
    stat={
        start_time:0,
        lost_times:0,
        recv_msg_cnt: 0,
        sent_msg_cnt: 0,
        msg_cnt_per_min:0
    }
    isAdmin(session: NSession<'mock'>): boolean {
        return false;
    }

    isMaster(session: NSession<'mock'>): boolean {
        return false;
    }
    isOnline(){
        return true
    }

    reply(session: NSession<'mock'>, message: Element.Fragment, quote?: boolean): Promise<any> {
        return Promise.resolve(undefined);
    }

    sendMsg(target_id: number, target_type: string, message: Element.Fragment): any {
    }

    start(): any {
    }

    disable():boolean
    disable(plugin:Plugin):this
    disable(plugin?:Plugin):boolean|this{
        if(!plugin) return false
        return this
    }
    enable():boolean
    enable(plugin:Plugin):this
    enable(plugin?:Plugin):boolean|this{
        if(!plugin) return true
        return this
    };
    internal: object;

    match(plugin: Plugin): boolean {
        return true;
    }

    get status(): Adapter.BotStatus {
        return undefined;
    }

    callApi<K extends keyof Bot.Methods>(apiName: K, ...args: Parameters<Bot.Methods[K]>): Promise<ReturnType<Bot.Methods[K]>> {
        return Promise.resolve(undefined);
    }

    createSession(event: string, ...args: any[]): NSession<"mock"> {
        return undefined;
    }

}