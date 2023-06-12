import {Context, NSession, h} from "zhin";
import {Chess} from "./chess";

export function install(ctx: Context) {
    ctx.middleware(async (session, next) => {
        if (session.detail_type !== 'group' && session.protocol === 'icqq') return next()
        try {
            await next()
            await Chess.input(session as NSession<'icqq', 'message.group'>)
        } catch (e) {
            session.reply(e.message)
        }
    })
    const cmd=ctx.command('game.chess')
        .desc('中国象棋游戏')
    cmd.command('chess.start')
        .desc('开始一局象棋游戏')
        .shortcut('下象棋')
        .action<NSession<'icqq','message.group'>>(async ({session}) => {
            if (Chess.rooms.get(session.group_id)) {
                return '当前已有对局'
            }
            Chess.rooms.set(session.group_id, Chess.createRoom(session.group_id, session.sender.user_id))
            const chess = Chess.rooms.get(session.group_id)
            const userCamp = chess.players.get(session.sender.user_id)
            return chess.output(`你被随机分配到${userCamp}`).join('')
        })
    cmd.command('chess.exit')
        .desc('结束当前群聊的象棋对局')
        .shortcut('结束对局')
        .action<NSession<'icqq','message.group'>>(async ({session}) => {
            const chess = Chess.rooms.get(session.group_id)
            if (!chess) {
                return '当前没有对局'
            } else if ([...chess.players.keys()].includes(session.sender.user_id)
                || session.member.is_admin
                || session.member.is_owner
                || session.isAdmin
                || session.isMaster
            ) {
                Chess.rooms.delete(session.group_id)
                return [h('mention', {user_id: session.sender.user_id}), '结束了对局'].join('')
            } else {
                return '非对局人员和管理员无法结束对局'
            }
        })
    cmd.command('chess.revert')
        .desc('悔棋')
        .shortcut('悔棋')
        .action<NSession<'icqq','message.group'>>(({session}) => {
            const chess = Chess.rooms.get(session.group_id)
            if (!chess) {
                return '当前没有对局'
            } else {
                return [].concat(chess.revert(session)).join('')
            }
        })
    cmd.command('chess.tips [input:string]')
        .desc('给出指定棋子的可走位置图')
        .sugar(/^提示(.+)/, {args: ['$1']})
        .action<NSession<'icqq','message.group'>>(({session}, input) => {
            return Chess.tips(session, input)
        })
    ctx.disposes.push(() => {
        Chess.rooms.clear()
        return false
    })
}
