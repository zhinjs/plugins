import {Bot} from "zhin";
export function isSameEnv(session1:Bot.MessageEvent,session2:Bot.MessageEvent){
    if(session1.message_type==='group')return session1.group_id===session2['group_id']
    if(session1.message_type==='discuss')return session1.discuss_id===session2['discuss_id']
    if(session1.message_type==='private')return session1.sender.user_id===session2.sender.user_id&&session2.message_type==='private'
    return false
}
export function formatContext(session: Bot.MessageEvent) {
    return session.message_type === 'private' ? `私聊 ${session.sender.user_id}` : `群聊 ${session['group_id']}`
}
