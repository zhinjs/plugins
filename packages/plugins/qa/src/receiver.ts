import {Dialogue} from './teach'
import {Context, NSession, Zhin,Element} from "zhin";

function hasEnv(envs:{type:string,target:string}[], type:string, target:string) {
    return envs.length === 0 || envs.some(env => {
        if(env.type==='*') return true
        if(env.type==='guild'){
            const [guild_id,channel_id='*',user_id='*']=target.split(':').filter(Boolean)
            const [env_guild_id,env_channel_id='*',env_user_id='*']=env.target.split(':')
            return env_guild_id===guild_id && (env_channel_id==='*' || env_channel_id===channel_id) && (env_user_id==='*' || env_user_id===user_id)
        }else if (env.type==='group'){
            const [group_id, user_id='*']=target.split(':').filter(Boolean)
            const [env_group_id,env_user_id='*']=env.target.split(':')
            return env_group_id===group_id && (env_user_id==='*' || env_user_id===user_id)
        }else if (env.type==='user'){
            return env.target==='*' || env.target===target
        }
    })
}


export async function triggerTeach(ctx: Context, session:NSession<keyof Zhin.Bots>) {
    const teaches = await ctx.database.models.QA.findAll()
    const question=session.content
    const target=[
        session.guild_id,
        session.channel_id,
        session.group_id,
        session.user_id
    ].filter(Boolean).join(':')
    const dialogues = teaches.map(teach => teach.toJSON())
        .filter((teach) => hasEnv(teach.belongs, session.detail_type, target))
        .filter(teach => {
            return teach.isReg ?
                new RegExp(teach.question).test(question) :
                question === teach.question
        })
    const totalProbability = dialogues.reduce((p, dialogue: Dialogue) => {
        p += dialogue.probability
        return p
    }, 0)

    function fixProbability(probability) {
        let baseProbability = 0
        dialogues.forEach((dialogue) => {
            dialogue.activeArea = [baseProbability, dialogue.probability / (totalProbability<0?1:totalProbability) + baseProbability]
            baseProbability += dialogue.probability / (totalProbability<0?1:totalProbability)
            dialogue['active'] = probability > dialogue.activeArea[0] && probability <= dialogue.activeArea[1]
        })
    }

    fixProbability(Math.random())
    if (!dialogues.length) return;
    const [dialogue] = dialogues.filter(d => d.active)
    const teach= teaches.find(t=>t.getDataValue('id')===dialogue.id)
    if (!dialogue) return;
    await teach.update({useTimes:dialogue.useTimes+1})
    if (dialogue.redirect) {
        if (dialogue.isReg) {
            const args = new RegExp(dialogue.question).exec(question)
            let index = 0
            while (index<args.length-1) {
                index++;
                const reg=new RegExp('\\$'+index,'gm')
                dialogue.redirect = dialogue.redirect.replace(reg, args[index])
            }
        }
        session.content = Element.stringify(dialogue.redirect)
        return triggerTeach(ctx, session)
    }
    if (dialogue.isReg) {
        const args = new RegExp(dialogue.question).exec(question)
        let index = 0
        while (index<args.length-1) {
            index++;
            const reg=new RegExp('\\$'+index,'gm')
            dialogue.answer = dialogue?.answer.replace(reg, args[index])
        }
    }
    return dialogue.answer.replace(/\$0/g,question)
}
export const name='qa.receiver'
export function install(ctx: Context) {
    let preMessageId:string=''
    ctx.middleware(async (session,next) =>{
        await next()
        if(preMessageId===session.message_id) return
        preMessageId=session.message_id
        if(session.type==='message'){
            const tpl=await triggerTeach(ctx, session).catch(()=>{})
            if(!tpl) return
            session.reply(tpl)
        };
    },true)
}
