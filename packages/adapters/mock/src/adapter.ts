import {Adapter, Zhin, AdapterOptions, Random} from "zhin";
import {MockBot} from "./bot";
import {Group} from "./group";
import {Friend, Member} from "./user";
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
    constructor(zhin:Zhin,platform:'mock',options:AdapterOptions) {
        super(zhin,platform,options);
    }
    // 创个模拟群
    createGroup(bot_id:string,group_id=Random.id(8),group_name=group_id){
        //1. 获取机器人
        const bot=this.zhin.pickBot('mock',bot_id)
        //2. 初始化群资料和群主资料
        const groupInfo={group_id,group_name}
        const ownerInfo={user_id:bot.self_id,user_name:'Zhin'}
        //3. 初始化群实例，群主实例，群成员实例
        const group=new Group(bot,bot.self_id,{group_id,group_name})
        const owner=new Member(bot,{...groupInfo,...ownerInfo})
        //4. 绑定关联关系
        group.ml.set(bot.self_id,owner)
        bot.gl.set(group_id,group)
        return group
    }
    // 模拟群成员
    createMember(bot_id:string,group_id:string,member_id=Random.id(8),title=member_id){
        //1. 获取机器人、群
        const bot=this.zhin.pickBot('mock',bot_id)
        const group=bot.pickGroup(group_id)
        //2. 初始化实例
        const member=new Member(bot,{
            group_id,
            group_name:group.info.group_name,
            user_id:member_id,
            user_name:member_id,
            title
        })
        //3. 绑定关联关系
        group.ml.set(member_id,member)
        return member
    }
    // 模拟用户
    createFriend(bot_id:string,user_id=Random.id(8),user_name=user_id){
        //1. 获取机器人
        const bot=this.zhin.pickBot('mock',bot_id)
        //2. 初始化实例
        const friend=new Friend(bot,{user_id,user_name})
        //3. 绑定关联关系
        bot.fl.set(user_id,friend)
        return friend
    }
}