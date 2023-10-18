import { Element} from 'zhin'
import {MockBot} from "./bot";
import {Sender} from "./sender";
export class User extends Sender{
    constructor(bot:MockBot,public info:User.Info) {
        super(bot);
    }
    asFriend(){
        return this.bot.pickFriend(this.info.user_id)
    }
    asMember(group_id:string){
        return this.bot.pickMember(group_id,this.info.user_id)
    }
    sendMsg(message:Element.Fragment){
        return this.bot.sendMsg(this.info.user_id,'private',message)
    }
}
export class Friend extends User{
    constructor(bot:MockBot,public info:Friend.Info) {
        super(bot,info);
    }
    static as(this:MockBot,user_id:string){
        const friend=this.fl.get(user_id)
        if(friend) return friend
        throw new Error(`没有好友:${user_id}`)
    }
}
export class Member extends User{
    constructor(bot:MockBot,public info:Member.Info) {
        super(bot,info);
    }
    static as(this:MockBot,group_id:string,member_id:string){
        const group=this.gl.get(group_id)
        if(!group) throw new Error(`没有群:${group_id}`)
        const member=group.ml.get(member_id)
        if(!member) throw new Error(`群(${group_id})没有成员:${group_id}`)
        return member
    }
    get group(){
        return this.bot.gl.get(this.info.group_id)
    }
}
export namespace Member{
    export interface Info extends User.Info{
        group_id:string
        group_name:string
        title:string
        card?:string
    }
}
export namespace Friend{
    export interface Info extends User.Info{
        remark?:string
    }
}
export namespace User{
    export interface Info{
        user_id:string
        user_name:string
    }
}
