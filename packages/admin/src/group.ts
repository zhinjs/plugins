import {Bot} from "zhin";
import{core} from 'icqq'
export const name='groupAdmin'
import '@zhinjs/plugin-prompt'
export function install(ctx: Bot) {
    ctx.command('group','group')
        .desc('群功能')
    ctx.command('admin/group/打卡','group')
        .desc('群打卡')
        .action(async ({event})=>await ctx.sendUni("OidbSvc.0xeb7", core.pb.encode({
                "1": 3767,
                "2": 1,
                "3": 0,
                "4": {
                    "2": {
                        "1": `${ctx.uin}`,
                        "2": `${event.group_id}`,
                        "3": ctx.apk.ver
                    }
                },
                "5": ctx.sig.seq + 1,
                "6": "616E64726F696420382E362E30"
            })).then(res=>{
                const strArr=res.toString().match(/[\w\d\s\u4e00-\u9fa5]/g)||[]
                return strArr.join('')
            })
        )
    ctx.command('admin/group/quit','group')
        .desc('退出当前群聊')
        .auth("admins",'master')
        .action(async ({event})=>{
            if(ctx.pickGroup(event.group_id).is_owner) {
                const confirm=await event.prompt.confirm('机器人为群主，确认解散？')
                if(!confirm) return
            }
            await event.reply('再见了，各位')
            await ctx.pickGroup(event['group_id']).quit().catch(()=>{})
            await ctx.sendMsg(`private:${event.user_id}`,`已退出群聊:${event['group_id']}`)
        })
    ctx.command('admin/group/mute [...userIds:qq]', 'group')
        .desc('禁言群成员')
        .option('time', '-t <time:number> 禁言时长（单位：秒；默认：600）')
        .auth("admins","admin","owner","master")
        .action(async ({event, options}, ...user_ids) => {
            if (!user_ids.length) {
                const ids = await event.prompt.list('请输入你要禁言的成员qq',{child_type:'number'})
                if (ids) user_ids.push(...ids)
            }
            if (!user_ids.length) return '禁言了0个成员'
            for (const user_id of user_ids) {
                await ctx.pickGroup(event['group_id']).muteMember(user_id, options.time)
            }
            if (options.time === 0) return `已解除禁言:${user_ids.join(',')}。`
            return `已禁言:${user_ids.join(',')}。\n禁言时长：${(options.time || 600) / 60}分钟`
        })

    ctx.command('admin/group/kick [...user_id:qq]', 'group')
        .desc('踢出群成员')
        .option('block', '-b 是否拉入黑名单(默认false)')
        .auth("admins","admin","owner","master")
        .action(async ({event, options}, ...user_ids) => {
            if (!user_ids.length) {
                const ids = await event.prompt.list('请输入你要踢出的成员qq',{child_type:'number'})
                if (ids) user_ids.push(...ids)
            }
            if (!user_ids.length) return '踢出了0个成员'
            for (const user_id of user_ids) {
                await ctx.pickGroup(event['group_id']).kickMember(user_id, options.block)
            }
            return `已踢出成员:${user_ids.join(',')}。`
        })
    ctx.command('admin/group/invite [...user_id:qq]', 'group')
        .desc('邀请好友加入群')
        .action(async ({event, options}, ...user_ids) => {
            if (!user_ids.length) {
                const ids = await event.prompt.list('请输入你要邀请的好友qq',{child_type:'number'})
                if (ids) user_ids.push(...ids)
            }
            if (!user_ids.length) return '邀请了了0个好友'
            for (const user_id of user_ids) {
                await ctx.pickGroup(event['group_id']).invite(user_id)
            }
            return `已邀请:${user_ids.join(',')}。`
        })
    ctx.command('admin/group/setAdmin [...user_id:qq]','group')
        .desc('设置/取消群管理员')
        .option('cancel','-c 是否为取消(为true时即取消管理员)')
        .auth("owner","master")
        .action(async ({event,options}, ...user_ids)=>{
            if (!user_ids.length) {
                const ids = await event.prompt.list(`请输入你要${!options.cancel?'设置':'取消'}管理员的成员qq`,{child_type:'number'})
                if (ids) user_ids.push(...ids)
            }
            if (!user_ids.length) return `${!options.cancel?'设置':'取消'}了0个管理员`
            for (const admin of user_ids) {
                await ctx.pickGroup(event['group_id']).setAdmin(admin,!options.cancel)
            }
            return `已将${user_ids.join(',')}${!options.cancel?'设置为':'取消'}管理员。`
        })
    ctx.command('admin/group/setTitle [title:string] [user_id:qq]','group')
        .desc('设置群成员头衔')
        .auth("owner","master")
        .check(({event})=>{
            if (!ctx.isMaster(event.user_id)||!ctx.pickGroup(event['group_id']).is_owner) {
                return '权限不足：'+(!ctx.isMaster(event.user_id)?'主人才能调用':'我不是群主')
            }
        })
        .action(async ({event},title,user_id)=>{
            if(!user_id){
                const id = await event.prompt.number('请输入你要设置头衔的成员qq')
                if (id) user_id=id
            }
            if(!user_id)return '群成员qq无效'
            if(!title){
                const nTitle = await event.prompt.text('请输入你要设置的头衔')
                if (nTitle) title=nTitle
            }
            if(!title) return '头衔不能为空'
            await ctx.pickGroup(event['group_id']).setTitle(user_id,title)
            return '执行成功'
        })
    ctx.command('admin/group/setCard [card:string] [user_id:qq]','group')
        .desc('设置群成员名片')
        .auth("admins","admin","owner","master")
        .action(async ({event},card,user_id)=>{
            if(!user_id){
                const id = await event.prompt.number('请输入你要设置名片的成员qq')
                if (id) user_id=id
            }
            if(!user_id)return '群成员qq无效'
            if(!card){
                const nCard = await event.prompt.text('请输入你要设置的名片')
                if (nCard) card=nCard
            }
            if(!card) return '名片不能为空'
            await ctx.pickGroup(event['group_id']).setCard(user_id,card)
            return '执行成功'
        })
}
