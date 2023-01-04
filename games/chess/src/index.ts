import {Bot,Plugin} from "zhin";
import {Chess} from "./chess";
import {GroupMessageEvent} from "oicq/lib/events";
import {segment} from "oicq";
export function install(this:Plugin,bot:Bot){
    bot.middleware(async (msg,next)=>{
        if(msg.message_type!=='group') return next()
        try{
            await next()
            await Chess.input(msg as GroupMessageEvent)
        }catch (e){
            msg.reply(e.message)
        }
    })
    bot.command('chess',"group")
        .desc('中国象棋游戏')
    bot.command('chess/chess.start',"group")
        .desc('开始一局象棋游戏')
        .shortcut('下象棋')
        .action(async ({event})=>{
            if(Chess.rooms.get(event.group_id)){
                return '当前已有对局'
            }
            Chess.rooms.set(event.group_id,Chess.createRoom(event.group_id,event.sender.user_id))
            const chess=Chess.rooms.get(event.group_id)
            const userCamp=chess.players.get(event.sender.user_id)
            return chess.output(`你被随机分配到${userCamp}`)
        })
    bot.command('chess/chess.exit',"group")
        .desc('结束当前群聊的象棋对局')
        .shortcut('结束对局')
        .action(async ({event})=>{
            const chess=Chess.rooms.get(event.group_id)
            if(!chess){
                return '当前没有对局'
            }else if([...chess.players.keys()].includes(event.sender.user_id)
                || event.member.is_admin
                || event.member.is_owner
                || bot.isAdmin(event.sender.user_id)
                || bot.isMaster(event.sender.user_id)
            ){
                Chess.rooms.delete(event.group_id)
                return [segment.at(event.sender.user_id),'结束了对局']
            }else{
                return '非对局人员和管理员无法结束对局'
            }
        })
    bot.command('chess/chess.revert',"group")
        .desc('悔棋')
        .shortcut('悔棋')
        .action(({event})=>{
            const chess=Chess.rooms.get(event.group_id)
            if(!chess) {
                return '当前没有对局'
            }else{
                return chess.revert(event)
            }
        })
    bot.command('chess/chess.tips [input:string]',"group")
        .desc('给出指定棋子的可走位置图')
        .shortcut(/^提示(.+)/,{args:['$1']})
        .action(({event},input)=>{
            return Chess.tips(event,input)
        })
    this.disposes.push(()=>{
        Chess.rooms.clear()
        return false
    })
}