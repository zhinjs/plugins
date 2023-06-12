import {Context, NSession, h} from "zhin";
import {Gobang} from "./gobang";

export function install(ctx: Context) {
    ctx.middleware(async (session, next) => {
        if (session.detail_type !== 'group' && session.protocol === 'icqq') return next()
        try {
            await next()
            await Gobang.input(session as NSession<'icqq', 'message.group'>)
        } catch (e) {
            session.reply(e.message)
        }
    })
    const cmd=ctx.command('game.gobang')
        .desc('五子棋游戏')
    cmd.command('gobang.start')
        .desc('开始一局五子棋游戏')
        .shortcut('下五子棋')
        .action<NSession<'icqq','message.group'>>(async ({session}) => {
            if (Gobang.rooms.get(session.group_id)) {
                return '当前已有对局'
            }
            Gobang.rooms.set(session.group_id, Gobang.createRoom(session.group_id, session.sender.user_id))
            const gobang = Gobang.rooms.get(session.group_id)
            const userCamp = gobang.players.get(session.sender.user_id)
            return gobang.output(`你被随机分配到${userCamp}`).join('')
        })
    cmd.command('gobang.exit')
        .desc('结束当前群聊的五子棋对局')
        .shortcut('结束对局')
        .action<NSession<'icqq','message.group'>>(async ({session}) => {
            const gobang = Gobang.rooms.get(session.group_id)
            if (!gobang) {
                return '当前没有对局'
            } else if ([...gobang.players.keys()].includes(session.sender.user_id)
                || session.member.is_admin
                || session.member.is_owner
                || session.isAdmin
                || session.isMaster
            ) {
                Gobang.rooms.delete(session.group_id)
                return [h('mention', {user_id: session.sender.user_id}), '结束了对局'].join('')
            } else {
                return '非对局人员和管理员无法结束对局'
            }
        })
    cmd.command('gobang.revert')
        .desc('悔棋')
        .shortcut('悔棋')
        .action<NSession<'icqq','message.group'>>(({session}) => {
            const gobang = Gobang.rooms.get(session.group_id)
            if (!gobang) {
                return '当前没有对局'
            } else {
                return [].concat(gobang.revert(session)).join('')
            }
        })
    ctx.disposes.push(() => {
        Gobang.rooms.clear()
        return false
    })
}
