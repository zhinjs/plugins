import {Dialogue} from './teach'
import {Context, NSession, Zhin,Element} from "zhin";

function hasEnv(envs, type, target) {
    return envs.length === 0 || envs.some(item => {
        return item.type === type && (item.target==='*' || item.target.includes(String(target)))
    })
}


export async function triggerTeach(ctx: Context, session:NSession<keyof Zhin.Bots>) {
    const teaches = await ctx.database.models.QA.findAll()
    const question=session.elements.join('')
    const dialogues = teaches.map(teach => teach.toJSON())
        .filter((teach) => hasEnv(teach.belongs, session.detail_type, session.group_id || session.discuss_id || session.user_id))
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
    if (!dialogue) return;
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
        session.elements = Element.parse(dialogue.redirect,session)
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
    let answerText=dialogue.answer
        .replace(/\$0/g,question)
    try{
        return await session.render(Element.parse(answerText,session))
    }catch{
        return answerText
    }
}
export const name='qa.receiver'
export function install(ctx: Context) {
    let preMessageId:string=''
    ctx.app.middleware(async (session,next) =>{
        await next()
        if(preMessageId===session.message_id) return
        preMessageId=session.message_id
        if(session.type==='message'){
            const result=await triggerTeach(ctx, session).catch(()=>{})
            if(result) session.reply(result)
        }
    },true)
}
