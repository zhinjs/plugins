import {Bot, toJSON} from "zhin";
import {toCqcode,fromCqcode} from 'icqq-cq-enable'
import {segment,Member,Friend,Group,Discuss,Forwardable} from 'icqq'
import {genGroupMessageId,genDmMessageId} from 'icqq/lib/message'
import * as music from './music'
import '@zhinjs/plugin-prompt'
export interface RecallConfig {
    recall?: number
}

export interface Respondent {
    match: string | RegExp
    reply: string | ((...capture: string[]) => string)
}
function getChannelId(event){
    return [event.message_type,event.group_id||event.discuss_id||event.user_id].join(':')
}
export interface BasicConfig extends RecallConfig {
    echo?: boolean
    send?: boolean
    github?: boolean
    feedback?: number | number[]
    respondent?: Respondent | Respondent[]
}

export function echo(bot: Bot) {
    bot.command('common/echo <varName:string>')
        .desc('输出当前会话中的变量值')
        .action(async ({event}, varName) => {
            console.log("I'm echo,var name is "+varName)
            let result: any = event
            if (!varName) return '请输入变量名'
            if (varName.match(/\(.*\)/) && !bot.isMaster(event.user_id)) return `禁止调用函数:this.${varName}`
            let varArr = varName.split('.')
            if (!bot.isMaster(event.user_id) && varArr.some(name => ['options', 'bot', 'app', 'config', 'password'].includes(name))) {
                return `不可达的位置：${varName}`
            }
            try {
                const func = new Function(`return this.${varArr.join('.')}`)
                result = func.apply(event)
            } catch (e) {
                if (result === undefined) e.stack = '未找到变量' + varName
                throw e
            }
            if (result === undefined) throw new Error('未找到变量' + varName)
            if(result instanceof Member||result instanceof Group || result instanceof Friend || result instanceof Discuss) result = toJSON(result)
            if(result instanceof Promise) result=await result
            if(['function','map'].includes(typeof result)) return result.toString()
            return JSON.stringify(result, null, 4).replace(/"/g, '')
        })
}

export function send(bot: Bot) {
    bot.command('common/send <message:text>')
        .desc('向当前上下文发送消息')
        .option('user', '-u [user:number]  发送到用户')
        .option('group', '-g [group:number]  发送到群')
        .option('discuss', '-d [discuss:number]  发送到讨论组')
        .action(async ({event, options}, message) => {
            if (!message) return '请输入需要发送的消息'
            if (options.user) {
                await bot.sendPrivateMsg(options.user, message)
                return true
            }
            if (options.group) {
                await bot.sendGroupMsg(options.group, message)
                return true
            }
            if (options.discuss) {
                await bot.sendDiscussMsg(options.discuss, message)
                return true
            }
            return message
        })
}

export function recall(bot: Bot, {recall = 10}: RecallConfig) {
    const recent: Record<string, string[]> = {}
    bot.on('message.send.success', (messageRet, channelId) => {
        const list = recent[channelId] ||= []
        list.unshift(messageRet.message_id)
        if (list.length > recall) {
            list.pop()
        }
    })
    bot
        .command('common/recall [count:number]')
        .desc('撤回机器人发送的消息')
        .action(async ({event}, count = 1) => {
            const list = recent[getChannelId(event)] ||= []
            if (!list.length) return '近期没有发送消息。'
            const removal = list.splice(0, count)
            if (!list.length) delete recent[getChannelId(event)]
            for (let index = 0; index < removal.length; index++) {
                try {
                    await bot.deleteMsg(removal[index])
                } catch (error) {
                    bot.logger.warn(error)
                }
            }
            return true
        })
}

export function feedback(bot: Bot, {
    operators
}: { operators: number[]}) {
    async function createReplyCallback(bot:Bot,event1:Bot.MessageEvent, user_id:number) {
        const dispose=bot.middleware((event2,next)=>{
            if(event2.source && event2.sender.user_id===user_id){
                switch (event2.message_type){
                    case "private":{
                        if(genDmMessageId(event2.sender.user_id,event2.source.seq,event2.source.rand,event2.source.time) !==event1.message_id) return next()
                        break;
                    }
                    case "group":{
                        if(genGroupMessageId(event2['group_id'],event2.sender.user_id,event2.source.seq,event2.source.rand,event2.source.time) !==event1.message_id) return next()
                        break;
                    }
                    case "discuss":{
                        if(genGroupMessageId(event2['discuss_id'],event2.sender.user_id,event2.source.seq,event2.source.rand,event2.source.time) !==event1.message_id) return next()
                        break;
                    }
                }
                event1.reply(['来自作者的回复：\n', ...event2.message], true)
                dispose()
            }
            else next()
        })
    }

    bot.command('common/feedback <message:text>')
        .desc('发送反馈信息给作者')
        .action(async ({event}, text) => {
            if (!text) return '请输入反馈消息'
            const name = event.sender['card'] || event.sender['title'] || event.sender.nickname || event.nickname

            const fromCN = {
                group: () => `群：${event['group_name']}(${event['group_id']})的${name}(${event.user_id})`,
                discuss: () => `讨论组：${event['discuss_name']}(${event['discuss_id']})的${name}(${event.user_id})`,
                private: () => `用户：${name}(${event.user_id})`
            }
            const message = `收到来自${fromCN[event.message_type]()}的消息：\n${text}`
            for (let index = 0; index < operators.length; ++index) {
                const user_id = operators[index]
                await bot.sendPrivateMsg(user_id, message)
                createReplyCallback(bot,event, user_id)
            }
            return '反馈成功'
        })
}

export function respondent(bot: Bot, respondents: Respondent[]) {
    bot.middleware((session) => {
        const message = session.toCqcode().trim()
        for (const {match, reply} of respondents) {
            const capture = typeof match === 'string' ? message === match && [message] : message.match(match)
            if (capture) return typeof reply === 'string' ? reply : reply(...capture)
        }
        return ''
    })
}

export function basic(bot: Bot, config: BasicConfig = {feedback: []}) {
    if(!config) config={}
    if (config.echo !== false) bot.plugin(echo)
    if (config.send !== false) bot.plugin(send)
    if (!(config.recall <= 0)) bot.plugin(recall, config)


    const operators = [].concat(config.feedback).filter(Boolean).map(op => Number(op))
    if (operators.length) bot.plugin(feedback, {operators})

    const respondents = [].concat(config.respondent).filter(Boolean)
    if (respondents.length) bot.plugin(respondent, respondents)
}

export function github(bot: Bot) {
    bot.middleware(async (event,next) => {
        await next()
        const mathReg = /(?:https?:\/\/)?(?:www\.)?github\.com\/([^/]+)\/([^/]+)\/?$/
        const match = event.toCqcode().match(mathReg)
        if (!match) return
        const [, owner, repo] = match
        const url = `https://opengraph.github.com/repo/${owner}/${repo}`
        event.reply(segment.image(url))
    })
}

export interface Config extends BasicConfig {
    name?: string
}
export const using=['prompt']
export const name='common'
export function install(bot: Bot, config: Config={}) {
    bot.command('code <pluginName:string>')
        .desc('输出指定插件源码')
        .action((_,pluginName)=>{
            if(!pluginName) return
            const plugin=bot.plugin(pluginName)
            const code:Function=plugin['install']||plugin
            return code.toString().replace(/(\\u.{4})+/g,(str)=>eval(`'${str}'`))
        })
    bot.command('common')
        .desc('基础功能')
    bot.command('common/segment')
        .desc('生成指定消息段内容')
    if (config && config.github !== false) bot.plugin(github)
    bot.command('common/segment/face <id:integer>')
        .desc('发送一个表情')
        .action((_, id) => segment.face(id))
    bot.command('common/segment/image <file>')
        .desc('发送一个一张图片')
        .action((_, file) => segment.image(file))
    bot.command('common/segment/at <qq:integer>')
        .desc('发送at')
        .action((_, at) => segment.at(at))
    bot.command('common/segment/dice [id:integer]')
        .desc('发送摇骰子结果')
        .action((_, id) => segment.dice(id))
    bot.command('common/segment/rps [id:integer]')
        .desc('发送猜拳结果')
        .action((_, id) => segment.rps(id))
    bot.command('common/segment/poke')
        .desc('发送戳一戳【随机一中类型】')
        .action((_, qq) => segment.poke(parseInt((Math.random() * 7).toFixed(0))))
    bot.command('common/segment/fake [user_id:qq] [message]')
        .desc('制作假的合并消息')
        .option('multiple','-m 制作多条')
        .action(async ({event, options}, user_id, message) => {
            if((!message || !user_id) && !options.multiple) return 'message and user_id is required'
            const messageArr:Forwardable[]=[]
            if(message && user_id) messageArr.push({
                message:fromCqcode(message),
                user_id,
                nickname:(await bot.pickUser(user_id).getSimpleInfo()).nickname
            })
            let finished=!options.multiple
            while (!finished){
                const {message,user_id,exit}=await event.prompt.prompts({
                    message:{
                        type:'text',
                        message:'请输入消息内容'
                    },
                    user_id:{
                        type:'qq',
                        message:'请输入模拟发送者id'
                    },
                    exit:{
                        type:'confirm',
                        message:'是否结束?'
                    }
                })
                if(message && user_id) messageArr.push({
                    message:fromCqcode(message as string),
                    user_id:user_id as number,
                    nickname:(await bot.pickUser(user_id as number).getSimpleInfo()).nickname
                })
                finished=!!exit
            }
            return await bot.makeForwardMsg(messageArr)
        })
    async function executeTemplate(this:Bot.MessageEvent,template:string):Promise<string>{
        template = template.replace(/\$A/g, `[CQ:at,qq=all]`)
            .replace(/\$a/g, `[CQ:at,qq=${this.user_id}]`)
            .replace(/\$m/g, `[CQ:at,qq=${bot.uin}]`)
            .replace(/\$s/g, () => this.sender['card'] || this.sender['title'] || this.sender.nickname)
            .replace(/\$S/g, () => `[CQ:reply,id=${this.message_id}]`);
        while (template.match(/\$\(.*\)/)) {
            const text = /\$\((.*)\)/.exec(template)[1];
            const executeResult = await executeTemplate.call(this,text);
            if (executeResult && typeof executeResult!=='boolean') {
                template = template.replace(/\$\((.*)\)/, executeResult);
            }
        }
        const result = await bot.executeCommand(this,template);
        if (result && typeof result !== "boolean")
            return typeof result==='string'?result:toCqcode({message:[result].flat()})
        return template;
    }
    bot.command('common/exec <command:text>')
        .desc('解析模板语法')
        .action(({event}, command) => executeTemplate.call(event,command))
    bot.plugin(basic, config)
    bot.plugin(music)
}
