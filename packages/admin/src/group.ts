import {Context} from "zhin";
export const name='qqGroupAdmin'
export const scope=['icqq'] as const
export function install(ctx: Context) {
    ctx.command('admin/group/quit')
        .desc('退出当前群聊')
        .auth("admins",'master')
        .action(async ({session})=>{
            await session.reply('再见了，各位')
            await session.bot.internal.setGroupLeave(session.group_id as number)
            await session.bot.sendMsg(session.user_id as never,'private',`已退出群聊:${event['group_id']}`)
        })
    ctx.command('admin/group/mute [...userIds:number]')
        .desc('禁言群成员')
        .option('all','-a 全体禁言')
        .option('cancel','-c 取消禁言')
        .option('time', '-t <time:number> 禁言时长（单位：秒；默认：600）')
        .auth("admins","master")
        .action(async ({session, options}, ...user_ids) => {
            if(!options.time && !options.all) options.cancel=true
            if (!user_ids.length && !options.all) {
                const ids = await session.prompt.list(`请输入你要${options.cancel?'取消':''}禁言的成员qq`,{child_type:'number'})
                if (ids) user_ids.push(...ids)
            }
            if(options.all){
                await session.bot.internal.pickGroup(session.group_id as number).muteAll(!options.cancel)
                return `已${options.cancel?'取消':''}全体禁言`
            }
            if (!user_ids.length) return `${options.cancel?'取消':''}禁言了0个成员`
            for (const user_id of user_ids) {
                await session.bot.internal.setGroupBan(session.group_id as number,user_id, options.cancel?0:options.time)
            }
            return `已${options.cancel?'取消':''}禁言:${user_ids.join(',')}。${options.cancel?'':`\n禁言时长：${(options.time || 600) / 60}分钟`}`
        })

    ctx.command('admin/group/kick [...user_id:number]', 'group')
        .desc('踢出群成员')
        .option('block', '-b 是否拉入黑名单(默认false)')
        .auth("admins","master")
        .action(async ({session, options}, ...user_ids) => {
            if (!user_ids.length) {
                const ids = await session.prompt.list('请输入你要踢出的成员qq',{child_type:'number'})
                if (ids) user_ids.push(...ids)
            }
            if (!user_ids.length) return '踢出了0个成员'
            for (const user_id of user_ids) {
                await session.bot.internal.setGroupKick(session.group_id as number,user_id, options.block)
            }
            return `已踢出成员:${user_ids.join(',')}。`
        })
    ctx.command('admin/group/setAdmin [...user_id:number]','group')
        .desc('设置/取消群管理员')
        .option('cancel','-c 是否为取消(为true时即取消管理员)')
        .auth("master")
        .action(async ({session,options}, ...user_ids)=>{
            if (!user_ids.length) {
                const ids = await session.prompt.list(`请输入你要${!options.cancel?'设置':'取消'}管理员的成员qq`,{child_type:'number'})
                if (ids) user_ids.push(...ids)
            }
            if (!user_ids.length) return `${!options.cancel?'设置':'取消'}了0个管理员`
            for (const admin of user_ids) {
                await session.bot.internal.setGroupAdmin(session.group_id as number,admin,!options.cancel)
            }
            return `已将${user_ids.join(',')}${!options.cancel?'设置为':'取消'}管理员。`
        })
    ctx.command('admin/group/setTitle [title:string] [user_id:number]','group')
        .desc('设置群成员头衔')
        .auth("master")
        .action(async ({session},title,user_id)=>{
            if(!user_id){
                const id = await session.prompt.number('请输入你要设置头衔的成员qq')
                if (id) user_id=id
            }
            if(!user_id)return '群成员qq无效'
            if(!title){
                const nTitle = await session.prompt.text('请输入你要设置的头衔')
                if (nTitle) title=nTitle
            }
            if(!title) return '头衔不能为空'
            await session.bot.internal.setGroupSpecialTitle(session.group_id as number,user_id,title)
            return '执行成功'
        })
    ctx.command('admin/group/setCard [card:string] [user_id:number]','group')
        .desc('设置群成员名片')
        .auth("admins","master")
        .action(async ({session},card,user_id)=>{
            if(!user_id){
                const id = await session.prompt.number('请输入你要设置名片的成员qq')
                if (id) user_id=id
            }
            if(!user_id)return '群成员qq无效'
            if(!card){
                const nCard = await session.prompt.text('请输入你要设置的名片')
                if (nCard) card=nCard
            }
            if(!card) return '名片不能为空'
            await session.bot.internal.setGroupCard(session.group_id as number,user_id,card)
            return '执行成功'
        })
}
