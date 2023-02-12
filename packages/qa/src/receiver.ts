import {Dialogue} from './teach'
import {Context, NSession, Zhin,Element} from "zhin";

function hasEnv(envs, type, target) {
    return envs.length === 0 || envs.some(item => {
        return item.type === type && (item.target==='*' || item.target.includes(String(target)))
    })
}


export async function triggerTeach(bot: Context, session:NSession<keyof Zhin.Bots>) {
    const teaches = await bot.database.models.QA.findAll()
    const question=session.elements.join('')
    const dialogues = teaches.map(teach => teach.toJSON())
        .filter((teach) => hasEnv(teach.belongs, session.type, session['group_id'] || session['discuss_id'] || session.user_id))
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
        return triggerTeach(bot, session)
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
        return await session.execute({
            name:'exec',
            session:session as any,
            args:[answerText]
        })
    }catch{
        return answerText
    }
}
export const name='qa.receiver'
export function install(bot: Context) {
    let preMessageId:string=''
    bot.middleware(async (message,next) =>{
        if(preMessageId===message.message_id) return next()
        preMessageId=message.message_id
        if(message.detail_type==='message'){
            const result=await triggerTeach(bot, message).catch(()=>{})
            if(result) message.reply(result)
        }
        await next()
    })
}
