import {h, NSession, Context, Zhin, Schema, useOptions, Session} from "zhin";
import * as fs from 'fs'
import * as music from './music'

export interface RecallConfig {
    recall?: number
}

export interface BasicConfig extends RecallConfig {
    echo?: boolean
    send?: boolean
    feedback?: number | number[]
}

export const name = 'common'
export const Config = Schema.object({
    recall: Schema.number().description('撤回消息缓冲条数').default(10),
    echo: Schema.boolean().description('是否启用echo插件'),
    send: Schema.boolean().description('是否启用send插件'),
    feedback: Schema.union([Schema.number(), Schema.array(Schema.number())]).description('接收反馈消息的用户ID'),
})

export interface Config extends BasicConfig {
}

export function install(ctx: Context) {
    ctx.command('code <pluginName:string>')
        .desc('输出指定插件源码')
        .action((_, pluginName) => {
            const plugins = ctx.zhin.getInstalledModules("plugin")
            const plugin = plugins.find(p => p.name === pluginName || p.fullName === pluginName)
            if (!plugin) return '未找到插件'
            return plugin.setup ?
                fs.readFileSync(plugin.fullPath, 'utf8') :
                plugin.install.toString().replace(/(\\u.{4})+/g, (str) => eval(`'${str}'`))
        })
    ctx.command('common')
        .desc('基础功能')
    ctx.platform('icqq')
        .command('common/thumbMe')
        .alias('赞我')
        .desc('为你点赞')
        .option('-t [times:number] 赞多少次,默认10，每人人最多20次/天',10)
        .action<NSession<'icqq','message'>>(async ({session,options}) => {
            const result = await session.bot.internal.pickUser(Number(session.user_id)).thumbUp(Math.min(options.times||10,20))
            if (result) return '给你赞好啦'
            return '不能再赞了！！'
        })
    ctx.command('common/segment')
        .desc('生成指定消息段内容')
    ctx.command('common/segment/face <id:number>')
        .desc('发送一个表情')
        .action((_, id) => h('face', {id}))
    ctx.command('common/segment/image <file:string>')
        .desc('发送一个一张图片')
        .action((_, file) => h('image', {src: file}))
    ctx.command('common/segment/mention <user_id:user_id>')
        .desc('发送mention')
        .action((_, user_id) => h('mention', {user_id}))
    ctx.command('common/segment/dice [id:integer]')
        .desc('发送摇骰子结果')
        .action((_, id) => h('dice', {id}))
    ctx.command('common/segment/rps [id:integer]')
        .desc('发送猜拳结果')
        .action((_, id) => h('rpx', {id}))
    ctx.command('common/segment/poke')
        .desc('发送戳一戳【随机一中类型】')
    ctx.plugin(basic)
    ctx.plugin(music)
}

export function echo(ctx: Context) {
    ctx.command('common/echo <varName:text>')
        .desc('输出当前会话中的变量值')
        .action<Session>(async ({session}, varName) => {
            let result: any = session
            if (!varName) return '请输入变量名'
            if (varName.match(/\(.*\)/) && !session.isMaster) return `禁止调用函数:this.${varName}`
            let varArr = varName.split('.')
            if (!session.isMaster && varArr.some(name => ['options', 'ctx', 'app', 'config', 'password'].includes(name))) {
                return `不可达的位置：${varName}`
            }
            try {
                const func = new Function(`return this.${varArr.join('.')}`)
                result = func.apply(session)
            } catch (e) {
                if (result === undefined) e.stack = '未找到变量' + varName
                throw e
            }
            if (result === undefined) throw new Error('未找到变量' + varName)
            if (result instanceof Promise) result = await result
            if (['function', 'map'].includes(typeof result)) return result.toString()
            return JSON.stringify(result, null, 4).replace(/"/g, '')
        })
}

export function send(ctx: Context) {
    ctx.command('common/send <message:text>')
        .desc('向当前上下文发送消息')
        .option('-u [user:number]  发送到用户')
        .option('-g [group:number]  发送到群')
        .option('-d [discuss:number]  发送到讨论组')
        .action<Session>(async ({session, options}, message) => {
            if (!message) return '请输入需要发送的消息'
            if (options.user) {
                await session.bot.sendMsg( options.user, 'private', message)
                return true
            }
            if (options.group) {
                await session.bot.sendMsg(options.group, 'group', message)
                return true
            }
            if (options.discuss) {
                await session.bot.sendMsg( options.discuss, 'discuss', message)
                return true
            }
            return message
        })
}

export function recall(ctx: Context) {
    const {recall = 10} = Config(useOptions('plugins.common'))
    const recent: Record<string, string[]> = {}
    ctx.on('message.send', (self_id,{message_id, to_id}) => {
        const list = recent[to_id] ||= []
        list.unshift(message_id)
        if (list.length > recall) {
            list.pop()
        }
    })
    ctx.command('common/recall [count:number]')
        .desc('撤回机器人发送的消息')
        .action<Session>(async ({session}, count = 1) => {
            let target_id = session.group_id || session.user_id
            const list = recent[target_id] ||= []
            if (!list.length) return '近期没有发送消息。'
            const removal = list.splice(0, count)
            if (!list.length) delete recent[target_id]
            for (let index = 0; index < removal.length; index++) {
                try {
                    await session.bot.deleteMsg(removal[index])
                } catch (error) {
                    ctx.logger.warn(error)
                }
            }
            return true
        })
}

export function feedback(ctx: Context) {
    let {feedback = []} = Config(useOptions('plugins.common'))
    let operators = [].concat(feedback)

    async function createReplyCallback(ctx: Context, session1: NSession<keyof Zhin.Bots>, message_id, user_id: number) {
        const dispose = ctx.middleware((session2, next) => {
            if (session2.quote) {
                if (session2.quote.message_id !== message_id) return next()
                session1.reply(['来自作者的回复：\n', session2.content])
                dispose()
            } else next()
        })
    }

    ctx.command('common/feedback <message:text>')
        .desc('发送反馈信息给作者')
        .action<NSession<'icqq','message'>>(async ({session}, text) => {
            if (!text) return '请输入反馈消息'
            const name = session.sender['card'] || session.sender['title'] || session.sender.nickname

            const fromCN = {
                group: () => `群：${session['group_name']}(${session['group_id']})的${name}(${session.user_id})`,
                discuss: () => `讨论组：${session['discuss_name']}(${session['discuss_id']})的${name}(${session.user_id})`,
                private: () => `用户：${name}(${session.user_id})`
            }
            const message = `收到来自${fromCN[session.detail_type]()}的消息：\n${text}`
            for (let index = 0; index < operators.length; ++index) {
                const user_id = operators[index]
                const {message_id} = await session.bot.sendMsg( user_id, 'private', message)
                createReplyCallback(ctx, session, message_id, user_id)
            }
            return '反馈成功'
        })
}

export function basic(ctx: Context, config: BasicConfig = {feedback: []}) {
    if (!config) config = {}
    if (config.echo !== false) ctx.plugin(echo)
    if (config.send !== false) ctx.plugin(send)
    if (!(config.recall <= 0)) ctx.plugin(recall)

    const operators = [].concat(config.feedback).filter(Boolean).map(op => Number(op))
    if (operators.length) ctx.plugin(feedback)
}

