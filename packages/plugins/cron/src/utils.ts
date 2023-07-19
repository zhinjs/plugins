import {Session} from "zhin";
export function isSameEnv(session1:Session,session2:Session){
    if(session1.detail_type==='guild')return session1.guild_id===session2['guild_id'] && session1.channel_id===session2['channel_id']
    if(session1.detail_type==='group')return session1.group_id===session2['group_id']
    if(session1.detail_type==='discuss')return session1.discuss_id===session2['discuss_id']
    if(session1.detail_type==='private')return session1.user_id===session2.user_id&&session2.detail_type==='private'
    return false
}
export function formatContext(session: Session) {
    return session.detail_type === 'private' ? `私聊 ${session.user_id}` : `群聊 ${session['group_id']}`
}
