import {Dialogue} from './teach'
import {Bot, Plugin} from "zhin";
import {fromCqcode} from "icqq/lib/message/cqCode";

function hasEnv(envs, type, target) {
    return envs.length === 0 || envs.some(item => {
        return item.type === type && (item.target==='*' || item.target.includes(String(target)))
    })
}


export async function triggerTeach(bot: Bot, event:Bot.MessageEvent) {
    const teaches = await bot.database.models.QA.findAll()
    const question=event.toCqcode()
    const dialogues = teaches.map(teach => teach.toJSON())
        .filter((teach) => hasEnv(teach.belongs, event.message_type, event['group_id'] || event['discuss_id'] || event.user_id))
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
        event.message = fromCqcode(dialogue.redirect)
        return triggerTeach(bot, event)
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
        return await bot.execute({
            name:'exec',
            event,
            args:[answerText]
        })
    }catch{
        return answerText
    }
}
export const name='qa.receiver'
export default function install(bot: Bot) {
    let preMessageId:string=''
    bot.middleware(async (message,next) =>{
        if(preMessageId===message.message_id) return next()
        preMessageId=message.message_id
        if(message.post_type==='message'){
            const result=await triggerTeach(bot, message).catch(()=>{})
            if(result) message.reply(result)
        }
        await next()
    })
}
