import {formatContext, isSameEnv} from "./utils";
import {CronTable} from "./models";
import '@zhinjs/plugin-database'
import {Bot, Time, toJSON} from "zhin";
export const using=['database'] as const
export interface Config {
    minInterval?: number
}
export const name='cron'
export function install(bot: Bot, config: Config={}) {
    if(!config) config={}
    bot.database.define('cron',CronTable.model)
    async function hasCron(id: number) {
        const data = await bot.database.get('cron',{id})
        return !!data.length
    }

    async function prepareCron({ id, interval, command, time, lastCall }: CronTable.Types, event: Bot.MessageEvent) {
        const now = Date.now()
        const date = time.valueOf()

        async function executeCron() {
            bot.logger.debug('execute %d: %s', id, command)
            let result=await bot.execute({
                event,
                name:'exec',
                args:[command]
            })
            if(result && typeof result!=='boolean')await bot.sendMsg(Bot.getChannelId(event),result)
            if (!lastCall || !interval) return
            lastCall = new Date()
            await bot.database.set('cron',{id},{ lastCall })
        }

        if (!interval) {
            if (date < now) {
                await bot.database.delete('cron',{id})
                if (lastCall) await executeCron()
                return
            }

            bot.logger.debug('prepare %d: %s at %s', id, command, time)
            return bot.setTimeout(async () => {
                if (!await hasCron(id)) return
                await bot.database.delete('cron',{id})
                await executeCron()
            }, date - now)
        }

        bot.logger.debug('prepare %d: %c from %s every %s', id, command, time, Time.formatTimeShort(interval))
        const timeout = date < now ? interval - (now - date) % interval : date - now
        if (lastCall && timeout + now - interval > +lastCall) {
            await executeCron()
        }

        bot.setTimeout(async () => {
            if (!await hasCron(id)) return
            const cleanInterval = bot.setInterval(async () => {
                if (!await hasCron(id)) return cleanInterval()
                await executeCron()
            }, interval)
            await executeCron()
        }, timeout)
    }

    bot.after('ready', async () => {
        const crons = await bot.database.get('cron',{assignee:bot.uin})
        crons.forEach((cron) => {
            const schedule=cron.toJSON()
            const { event } = schedule
            prepareCron(schedule, event)
        })
    })

    bot.command('cron [time]')
        .desc('定时任务')
        .option('rest', '-- <command:text>  要执行的指令')
        .option('interval', '/ <interval:string>  设置触发的间隔秒数')
        .option('list', '-l  查看已经设置的日程')
        .option('ensure', '-e  错过时间也确保执行')
        .option('full', '-f  查找全部上下文')
        .option('delete', '-d <id>  删除已经设置的日程')
        .action(async ({ event, options }, ...dateSegments) => {
            if (options.delete) {
                await bot.database.delete('cron',{id:options.delete})
                return `日程 ${options.delete} 已删除。`
            }

            if (options.list) {
                let schedules = (await bot.database.get('cron')).map(t=>t.toJSON())
                if (!options.full) {
                    schedules = schedules.filter((s) => isSameEnv(s.event,event))
                }
                if (!schedules.length) return '当前没有等待执行的日程。'
                return schedules.map(({ id, time, interval, command, session }) => {
                    let output = `${id}. ${Time.formatTimeInterval(time, interval)}：${command}`
                    if (options.full) output += `，上下文：${formatContext(session)}`
                    return output
                }).join('\n')
            }

            if (!options.rest) return '请输入要执行的指令。'

            const dateString = dateSegments.join('-')
            const time = Time.parseDate(dateString)
            const timestamp = +time
            if (Number.isNaN(timestamp) || timestamp > 2147483647000) {
                if (/^\d+$/.test(dateString)) {
                    return `请输入合法的日期。你要输入的是不是 ${dateString}s？`
                } else {
                    return '请输入合法的日期。'
                }
            } else if (!options.interval) {
                if (!dateString) {
                    return '请输入执行时间。'
                } else if (timestamp <= Date.now()) {
                    return '不能指定过去的时间为执行时间。'
                }
            }

            const interval = Time.parseTime(options.interval)
            if (!interval && options.interval) {
                return '请输入合法的时间间隔。'
            } else if (interval && interval < (config.minInterval||=60000)) {
                return '时间间隔过短。'
            }

            const [cron] = await bot.database.add('cron',{
                time,
                assignee: bot.uin,
                interval,
                command: options.rest,
                event: event.toJSON('prompt' as any),
            })
            prepareCron(cron.toJSON(), event)
            return `日程已创建，编号为 ${cron.toJSON().id}。`
        })
}
