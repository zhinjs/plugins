import {MockBot} from "./bot";
import { Element} from "zhin";
import {Member} from "./user";
import {Sender} from "./sender";

export class Group extends Sender{
    readonly ml:Map<string,Member>=new Map<string, Member>()
    static as(this:MockBot,group_id:string){
        const group=this.gl.get(group_id)
        if(!group) throw new Error(`没有群:${group_id}`)
        return group
    }
    admins:string[]=[]
    constructor(public bot:MockBot,public owner:string,public info:Group.Info) {
        super(bot);
    }
    get group_id(){
        return this.info.group_id
    }
    get group_name(){
        return this.info.group_name
    }
    sendMsg(message:Element.Fragment){
        return this.bot.sendMsg(this.info.group_id,'group',message)
    }
    pickMember(member_id:string){
        return this.bot.pickMember(this.info.group_id,member_id)
    }
}
export namespace Group{
    export interface Info{
        group_id:string
        group_name:string
    }
}
