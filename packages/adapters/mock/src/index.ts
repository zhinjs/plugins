import {Adapter, Zhin, AdapterOptions, Random, BotOptions, Bot} from "zhin";
import {MockBot} from "./bot";
import {Group} from "./group";
import '@zhinjs/plugin-console'
import {Friend, Member} from "./user";
import path from "path";
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
declare module '@zhinjs/plugin-console' {
    interface Events {
        'mock/bots'(): Promise<BotOptions[]>
        'mock/message_receive'(message: Bot.Message): void
        'mock/get_mock_list'(self_id:string): Promise<MockBot.FriendInfo[]>
        'mock/get_group_list'(self_id:string): Promise<MockBot.GroupInfo[]>
        'mock/send_private_msg'(self_id:string,user_id:string,message:string):Promise<Bot.MessageRet>
        'mock/send_group_msg'(self_id:string,group_id:string,user_id:string,message:string):Promise<Bot.MessageRet>
        'mock/get_group_info'(self_id:string,group_id: string): Promise<MockBot.GroupInfo>
        'mock/get_group_member_list'(self_id:string,group_id: string): Promise<MockBot.GroupMember[]>
        'mock/get_group_member_info'(self_id:string,group_id: string, user_id: string): Promise<MockBot.GroupMember>
        'mock/get_friend_list'(self_id:string): Promise<MockBot.FriendInfo[]>
        'mock/get_friend_info'(self_id:string,user_id: string): Promise<MockBot.FriendInfo>
    }
}
export class MockAdapter extends Adapter<'mock'>{
    constructor(zhin:Zhin,platform:'mock',options:AdapterOptions) {
        super(zhin,platform,options);
        zhin.console.addEntry({
            prod: path.resolve(__dirname, '../dist'),
            dev: path.resolve(__dirname, '../client/index.ts'),
        })
        zhin.console.addListener('mock/bots',async ()=>{
            return this.options.bots
        })
        this.on('mock/message_send',(msg)=>{
            this.zhin.console.ws.broadcast('mock/message_receive',msg)
        })
        this.on('mock/message_receive',(msg)=>{
            this.zhin.console.ws.broadcast('mock/message_receive',msg)
        })
        zhin.console.addListener('mock/send_private_msg',async (self_id:string,user_id:string,content:string)=>{
            const message_id=Random.id(16)
            const time=Date.now()
            this.bots.get(self_id)?.emit('mock/message_receive',{
                self_id,
                message_id,
                user_id,
                content,
                time,
                detail_type:'private'
            })
            return {
                user_id,
                message_id,
                from_id:user_id,
                to_id:self_id,
                type:'private' as any,
                content,
                time
            }
        })
        zhin.console.addListener('mock/send_group_msg',async (self_id:string,group_id:string,user_id:string,content:string)=>{
            const message_id=Random.id(16)
            const time=Date.now()
            this.bots.get(self_id).emit('mock/message_receive',{
                self_id,
                message_id,
                user_id,
                group_id,
                content,
                time,
                detail_type:'group'
            })
            return {
                user_id:self_id,
                message_id,
                from_id:self_id,
                to_id:group_id,
                type:'group' as any,
                content,
                time
            }
        })
        zhin.console.addListener('mock/get_mock_list',async (self_id:string)=>{
            return [...this.bots.get(self_id).fl.values()].map(f=>f.info)
        })
        zhin.console.addListener('mock/get_friend_list',async (self_id:string)=>{
            return [
                {
                    user_id:self_id,
                    user_name:'Zhin'
                }
            ]
        })
        zhin.console.addListener('mock/get_friend_info',async (self_id:string,user_id:string)=>{
            return {
                user_id:user_id,
                user_name:'Zhin'
            }
        })
        zhin.console.addListener('mock/get_group_list',async (self_id:string)=>{
            return [...this.bots.get(self_id).gl.values()].map(g=>g.info)
        })
        zhin.console.addListener('mock/get_group_info',async (self_id:string,group_id:string)=>{
            return this.bots.get(self_id).gl.get(group_id)?.info
        })
        zhin.console.addListener('mock/get_group_member_list',async (self_id:string,group_id:string)=>{
            return [...this.bots.get(self_id).gl.get(group_id)?.ml.values()].map(m=>m.info).flat()
        })
        zhin.console.addListener('mock/get_group_member_info',async (self_id:string,group_id:string,user_id:string)=>{
            return this.bots.get(self_id).gl.get(group_id)?.ml.get(user_id)?.info
        })
    }
    async start(){
        for(const botOptions of this.options.bots){
            this.startBot(botOptions)
        }
    }
    // 创个模拟群
    createGroup(bot_id:string,group_id=Random.id(8),group_name=`虚拟群聊${group_id.slice(0,1)}`){
        //1. 获取机器人
        const bot=this.bots.get(bot_id)
        //2. 初始化群资料和群主资料
        const groupInfo={group_id,group_name}
        const ownerInfo={user_id:bot.self_id,user_name:'Zhin'}
        //3. 初始化群实例，群主实例，群成员实例
        const group=new Group(bot,bot.self_id,{group_id,group_name})
        const owner=new Member(bot,{...groupInfo,...ownerInfo,title:''})
        //4. 绑定关联关系
        group.ml.set(bot.self_id,owner)
        bot.gl.set(group_id,group)
        return group
    }
    // 模拟群成员
    createMember(bot_id:string,group_id:string,member_id=Random.id(8),title=`虚拟群成员${member_id.slice(0,1)}`){
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
        bot.ul.set(member_id,member)
        return member
    }
    // 模拟用户
    createFriend(bot_id:string,user_id=Random.id(8),user_name=`模拟用户${user_id.slice(0,1)}`){
        //1. 获取机器人
        const bot=this.zhin.pickBot('mock',bot_id)
        //2. 初始化实例
        const friend=new Friend(bot,{user_id,user_name})
        //3. 绑定关联关系
        bot.fl.set(user_id,friend)
        bot.ul.set(user_id,friend)
        return friend
    }
}
Adapter.define('mock', MockAdapter, MockBot)
