import {Context, NSession,h} from "zhin";
import {Chess} from "./chess";
export function install(ctx:Context){
    ctx.middleware(async (session,next)=>{
        if(session.detail_type!=='group' && session.protocol==='icqq') return next()
        try{
            await next()
            await Chess.input(session as NSession<'icqq','message.group'>)
        }catch (e){
            session.reply(e.message)
        }
    })
    ctx.command('chess',"group")
        .desc('中国象棋游戏')
    ctx.command('chess/chess.start',"group")
        .desc('开始一局象棋游戏')
        .shortcut('下象棋')
        .action(async ({session})=>{
            if(Chess.rooms.get(session.group_id)){
                return '当前已有对局'
            }
            Chess.rooms.set(session.group_id,Chess.createRoom(session.group_id,session.sender.user_id))
            const chess=Chess.rooms.get(session.group_id)
            const userCamp=chess.players.get(session.sender.user_id)
            return chess.output(`你被随机分配到${userCamp}`)
        })
    ctx.command('chess/chess.exit',"group")
        .desc('结束当前群聊的象棋对局')
        .shortcut('结束对局')
        .action(async ({session,bot})=>{
            const chess=Chess.rooms.get(session.group_id)
            if(!chess){
                return '当前没有对局'
            }else if([...chess.players.keys()].includes(session.sender.user_id)
                || session.member.is_admin
                || session.member.is_owner
                || bot.isAdmin(session)
                || bot.isMaster(session)
            ){
                Chess.rooms.delete(session.group_id)
                return [h('mention',{user_id:session.sender.user_id}),'结束了对局']
            }else{
                return '非对局人员和管理员无法结束对局'
            }
        })
    ctx.command('chess/chess.revert',"group")
        .desc('悔棋')
        .shortcut('悔棋')
        .action(({session})=>{
            const chess=Chess.rooms.get(session.group_id)
            if(!chess) {
                return '当前没有对局'
            }else{
                return chess.revert(session)
            }
        })
    ctx.command('chess/chess.tips [input:string]',"group")
        .desc('给出指定棋子的可走位置图')
        .shortcut(/^提示(.+)/,{args:['$1']})
        .action(({session},input)=>{
            return Chess.tips(session,input)
        })
    ctx.disposes.push(()=>{
        Chess.rooms.clear()
        return false
    })
}