import {Context, NSession} from "zhin";

export const name = 'admin'
export function install(ctx: Context) {
    ctx.command('admin')
        .desc('管理知音')
    ctx.command('admin/group')
        .desc('群管插件')
    ctx = ctx.platform('icqq')
    async function handleApprove(
        e: NSession<'icqq', `request.${'group'|'friend'}.${'add'|'invite'}`>,
        filter: (session: NSession<'icqq', 'message.private'>) => boolean,
        approveCondition: (session: NSession<'icqq', 'message.private'>) => boolean
    ) {
        const dispose = ctx.middleware(async (session: NSession<'icqq', 'message.private'>, next) => {
            await next()
            if (!filter(session)) return
            dispose()
            const result=approveCondition(session)
            await e.approve(result)
            await session.reply(`已${result?'同意':'拒绝'}`)
        })
    }

    ctx.on('icqq.request.group.invite', async (e) => {
        if (e.bot.isAdmins(e) || e.bot.isMaster(e)) e.approve(true)
        else {
            const messageRets = await ctx.zhin.broadcast([e.bot.options.master, ...e.bot.options.admins].map(user_id => {
                return `${e.protocol}:${e.bot.self_id}:private:${user_id}` as any
            }), `用户 ${e.user_id}(${e.nickname}) 邀请我加入群 ${e.group_id}(${e.group_name})，同意请引用本消息并回复'同意'`)
            const messageIds = messageRets.map(m => m.message_id)
            await handleApprove(
                e,
                (s) => s.quote && messageIds.includes(s.quote.message_id),
                (s) => s.content === '同意'
            )
        }
    })

    ctx.on('icqq.request.group.add', async (e) => {
        if (e.bot.isAdmins(e) || e.bot.isMaster(e)) e.approve(true)
        else {
            const messageRets = await ctx.zhin.broadcast([e.bot.options.master, ...e.bot.options.admins].map(user_id => {
                return `${e.protocol}:${e.bot.self_id}:private:${user_id}` as any
            }), `用户 ${e.user_id}(${e.nickname}) 请求加入群 ${e.group_id}(${e.group_name})，同意请引用本消息并回复'同意'`)
            const messageIds = messageRets.map(m => m.message_id)
            await handleApprove(
                e,
                (s) => s.quote && messageIds.includes(s.quote.message_id),
                (s) => s.content === '同意'
            )
        }
    })
    ctx.on('icqq.request.friend.add', async (e) => {
        if (e.bot.isAdmins(e) || e.bot.isMaster(e)) e.approve(true)
        else {
            const messageRets = await ctx.zhin.broadcast([e.bot.options.master, ...e.bot.options.admins].map(user_id => {
                return `${e.protocol}:${e.bot.self_id}:private:${user_id}` as any
            }), `用户 ${e.user_id}(${e.nickname}) 想加我为好友，同意请引用本消息并回复'同意'`)
            const messageIds = messageRets.map(m => m.message_id)
            await handleApprove(
                e,
                (s) => s.quote && messageIds.includes(s.quote.message_id),
                (s) => s.content === '同意'
            )
        }
    })
    ctx.on('icqq.notice.group.increase',e=>{

    })
    ctx.role('admins',"master").command('admin/group/quit')
        .desc('退出当前群聊')
        .action<NSession<'icqq','message.group'>>(async ({session}) => {
            await session.reply('再见了，各位')
            await session.bot.internal.setGroupLeave(session.group_id as number)
            await session.bot.sendMsg(session.user_id as never, 'private', `已退出群聊:${session.group_id}`)
        })
    ctx.role('admins',"master","admin")
        .command('admin/group/mute [...userIds:user_id]')
        .desc('禁言群成员')
        .option('-a [all:boolean] 全体禁言')
        .option( '-c [cancel:boolean] 取消禁言')
        .option('-t [time:number] 禁言时长（单位：秒；默认：600）')
        .action<NSession<'icqq','message.group'>>(async ({session, options}, user_ids) => {
            if (!options.time && !options.all) options.cancel = true
            if (!user_ids.length && !options.all) {
                const ids = await session.prompt.list(`请输入你要${options.cancel ? '取消' : ''}禁言的成员qq`, {child_type: 'number'})
                if (ids) user_ids.push(...ids)
            }
            if (options.all) {
                await session.bot.internal.pickGroup(session.group_id as number).muteAll(!options.cancel)
                return `已${options.cancel ? '取消' : ''}全体禁言`
            }
            if (!user_ids.length) return `${options.cancel ? '取消' : ''}禁言了0个成员`
            for (const user_id of user_ids) {
                await session.bot.internal.setGroupBan(session.group_id as number, user_id as number, options.cancel ? 0 : options.time)
            }
            return `已${options.cancel ? '取消' : ''}禁言:${user_ids.join(',')}。${options.cancel ? '' : `\n禁言时长：${(options.time || 600) / 60}分钟`}`
        })

    ctx.role('admins','master','admin').command('admin/group/kick [...user_id:user_id]')
        .desc('踢出群成员')
        .option( '-b [block:boolean] 是否拉入黑名单(默认false)')
        .action<NSession<'icqq','message.group'>>(async ({session, options}, user_ids) => {
            if (!user_ids.length) {
                const ids = await session.prompt.list('请输入你要踢出的成员qq', {child_type: 'number'})
                if (ids) user_ids.push(...ids)
            }
            if (!user_ids.length) return '踢出了0个成员'
            for (const user_id of user_ids) {
                await session.bot.internal.setGroupKick(session.group_id as number, user_id as number, options.block)
            }
            return `已踢出成员:${user_ids.join(',')}。`
        })
    ctx.role("master", 'owner').command('admin/group/setAdmin [...user_id:user_id]')
        .desc('设置/取消群管理员')
        .option( '-c [cancel:boolean] 是否为取消(为true时即取消管理员)')
        .action<NSession<'icqq','message.group'>>(async ({session, options}, user_ids) => {
            if (!user_ids.length) {
                const ids = await session.prompt.list(`请输入你要${!options.cancel ? '设置' : '取消'}管理员的成员qq`, {child_type: 'number'})
                if (ids) user_ids.push(...ids)
            }
            if (!user_ids.length) return `${!options.cancel ? '设置' : '取消'}了0个管理员`
            for (const admin of user_ids) {
                await session.bot.internal.setGroupAdmin(session.group_id as number, admin as number, !options.cancel)
            }
            return `已将${user_ids.join(',')}${!options.cancel ? '设置为' : '取消'}管理员。`
        })
    ctx.role("master", 'admins', 'admin').command('admin/group/setTitle [title:string] [user_id:user_id]')
        .desc('设置群成员头衔')
        .action<NSession<'icqq','message.group'>>(async ({session}, title, user_id) => {
            if (!user_id) {
                const id = await session.prompt.number('请输入你要设置头衔的成员qq')
                if (id) user_id = id
            }
            if (!user_id) return '群成员qq无效'
            if (!title) {
                const nTitle = await session.prompt.text('请输入你要设置的头衔')
                if (nTitle) title = nTitle
            }
            if (!title) return '头衔不能为空'
            await session.bot.internal.setGroupSpecialTitle(session.group_id as number, user_id as number, title)
            return '执行成功'
        })
    ctx.role("admins", "master", "admin")
        .command('admin/group/setCard [card:string] [user_id:user_id]')
        .desc('设置群成员名片')
        .action<NSession<'icqq','message.group'>>(async ({session}, card, user_id) => {
            if (!user_id) {
                const id = await session.prompt.number('请输入你要设置名片的成员qq')
                if (id) user_id = id
            }
            if (!user_id) return '群成员qq无效'
            if (!card) {
                const nCard = await session.prompt.text('请输入你要设置的名片')
                if (nCard) card = nCard
            }
            if (!card) return '名片不能为空'
            await session.bot.internal.setGroupCard(session.group_id as number, user_id as number, card)
            return '执行成功'
        })
}
