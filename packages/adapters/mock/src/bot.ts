import {Server} from 'ws'
import {Bot, BotOptions, Element, NSession, Random, Session, Zhin} from "zhin";
import {MockAdapter} from "./adapter";
import {Group} from "./group";
import {Friend, Member} from "./user";

export class MockBot extends Bot<'mock', {}, {}, Server> {
    self_id: string;
    internal: Server;
    readonly gl: Map<string, Group> = new Map<string, Group>()
    readonly fl: Map<string, Friend> = new Map<string, Friend>()
    pickMember = Member.as.bind(this)
    pickFriend = Friend.as.bind(this)
    pickGroup = Group.as.bind(this)
    get history(){
        return [...this.gl,...this.fl].reduce((result, [_,cur])=>{
            result.push(...cur.history)
            return result
        },[]) as Bot.MessageRet[]
    }
    constructor(zhin: Zhin, public adapter: MockAdapter, options: BotOptions) {
        super(zhin, adapter, options);
        this.self_id = Random.id(10)
        this.internal = zhin.service('router').ws(`/mock/${this.self_id}`)
    }
    async getMsg(message_id:string){
        return this.history.find(m=>m.message_id===message_id)
    }
    async (message_id:string):boolean{
        return true
    }
    isOnline() {
        return true
    }

    reply(session: NSession<'mock'>, message: Element.Fragment, quote?: boolean): Promise<any> {
        const target_id=session.detail_type==='group'?session.group_id:session.user_id
        return this.sendMsg(''+target_id,session.detail_type as 'group'|'private',message);
    }

    sendMsg(target_id: string, target_type: 'group' | 'private', message: Element.Fragment) {
        const target = target_type === "group" ? this.pickGroup(target_id) : this.pickFriend(target_id)
        return target._sendMsg({
            from_id:this.self_id,
            to_id:target_id,
            type:target_type,
            content:Element.stringify(message)
        } as Bot.Message)
    }

    start(): any {
        this.internal.on('connection',(ws)=>{
            const group=this.adapter.createGroup(this.self_id)
            const member=this.adapter.createMember(this.self_id,group.info.group_id)
            const friend=this.adapter.createFriend(this.self_id)
            ws.on('message',(msg)=>{
                const payload:{type:'group'|'private',message:string}=JSON.parse(msg.toString())
                switch (payload.type){
                    case "private":
                        friend.history.push({
                            message_id:Random.id(16),
                            from_id:friend.info.user_id,
                            user_id:member.info.user_id,
                            to_id:this.self_id,
                            type:payload.type,
                            content:payload.message
                        })
                        break;
                    case "group":
                        group.history.push({
                            message_id:Random.id(16),
                            from_id:group.info.group_id,
                            user_id:member.info.user_id,
                            to_id:this.self_id,
                            type:payload.type,
                            content:payload.message
                        })
                        break;
                    default:
                        break;

                }
            })
            ws.on('close',()=>{
                group.ml.clear()
                this.gl.delete(group.info.group_id)
                this.fl.delete(friend.info.user_id)
            })
        })
    }
    createSession(event: string, payload: Record<string, any>): NSession<"mock"> {
        return {
            event,
            ...payload,
        } as NSession<'mock'>;
    }

}
