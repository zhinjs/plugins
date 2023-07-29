import {formatContext, isSameEnv} from "./utils";
import {CronTable} from "./models";
import '@zhinjs/plugin-database'
import {Context, Session, Element, Time, Zhin, h} from "zhin";

export const use = ['database'] as const

export interface Config {
    minInterval?: number
}

export const name = 'cron'

export async function install(ctx: Context, config: Config = {}) {
    if (!config) config = {}
    ctx.disposes.push(
        await ctx.beforeReady(async () => {
            ctx.disposes.push(
                await ctx.database.onCreated(() => {
                    ctx.database.define('cron', CronTable.model)
                    ctx.disposes.push(() => {
                        ctx.database.delete('cron')
                    })
                })
            )
        })
    )

    async function hasCron(id: number) {
        const data = await ctx.database.get('cron', {id})
        return !!data.length
    }

    async function prepareCron<P extends keyof Zhin.Adapters>({
                                                                  id,
                                                                  interval,
                                                                  command,
                                                                  time,
                                                                  lastCall
                                                              }: CronTable.Types, self_id: string | number, session: Session<P>) {
        const now = Date.now()
        const date = time.valueOf()
        const adapter = ctx.zhin.adapters.get(session.protocol) as Zhin.Adapters[P]
        if (!adapter) return
        session = new Session<P>(adapter, self_id, session.event, session)

        async function executeCron() {
            ctx.logger.debug('execute %d: %s', id, command)
            let result = await session.execute(command)
            if (result && typeof result !== 'boolean') await session.reply(result)
            if (!lastCall || !interval) return
            lastCall = new Date()
            await ctx.database.set('cron', {id}, {lastCall})
        }

        if (!interval) {
            if (date < now) {
                await ctx.database.destroy('cron', {id})
                if (lastCall) await executeCron()
                return
            }

            ctx.logger.debug('prepare %d: %s at %s', id, command, time)
            return ctx.setTimeout(async () => {
                if (!await hasCron(id)) return
                await ctx.database.destroy('cron', {id})
                await executeCron()
            }, date - now)
        }

        ctx.logger.debug('prepare %d: %c from %s every %s', id, command, time, Time.formatTimeShort(interval))
        const timeout = date < now ? interval - (now - date) % interval : date - now
        if (lastCall && timeout + now - interval > +lastCall) {
            await executeCron()
        }

        ctx.setTimeout(async () => {
            if (!await hasCron(id)) return
            const cleanInterval = ctx.setInterval(async () => {
                if (!await hasCron(id)) return cleanInterval()
                await executeCron()
            }, interval)
            await executeCron()
        }, timeout)
    }

    ctx.disposes.push(
        await ctx.afterStart(async () => {
            const crons = await ctx.database.get('cron', {})
            crons.forEach((cron) => {
                const schedule = cron.toJSON()
                const {session, assignee} = schedule
                prepareCron(schedule, assignee, session)
            })
        })
    )

    ctx.command('cron [time:string] [command:text]')
        .desc('定义定时执行指令')
        .option('-i [interval:string]  设置执行的间隔时间')
        .option('-l [list:boolean]  查看已经设置的执行队列')
        .option('-e [ensure:boolean]  错过时间也确保执行')
        .option('-f [full:boolean] 查找全部上下文')
        .option('-d [del:number]  删除已经设置的执行任务')
        .action<Session>(async ({session, options}, dateStr, command) => {
            if (options.del) {
                await ctx.database.destroy('cron', {id: options.del})
                return `日程 ${options.del} 已删除。`
            }

            if (options.list) {
                let schedules = (await ctx.database.get('cron')).map(t => t.toJSON())
                if (!options.full) {
                    schedules = schedules.filter((s) => isSameEnv(s.session, session))
                }
                if (!schedules.length) return '当前没有等待执行的日程。'
                return h('text',{
                    text:schedules.map(({id, time, interval, command, session}) => {
                        // 输出结果编码下，避免执行
                        let output = `${id}. ${Time.formatTimeInterval(time, interval)}：${command}`
                        if (options.full) output += `，上下文：${formatContext(session)}`
                        return output
                    }).join('\n')
                })
            }

            if (!command) return '请输入要执行的指令。'
            const time = Time.parseDate(dateStr)
            const timestamp = +time
            if (Number.isNaN(timestamp) || timestamp > 2147483647000) {
                if (/^\d+$/.test(dateStr)) {
                    return `请输入合法的日期。你要输入的是不是 ${dateStr}s？`
                } else {
                    return '请输入合法的日期。'
                }
            } else if (!options.interval) {
                if (!dateStr) {
                    return '请输入执行时间。'
                } else if (timestamp <= Date.now()) {
                    return '不能指定过去的时间为执行时间。'
                }
            }

            const interval = Time.parseTime(options.interval)
            if (!interval && options.interval) {
                return '请输入合法的时间间隔。'
            } else if (interval && interval < (config.minInterval ||= 60000)) {
                return '时间间隔过短。'
            }

            const [cron] = await ctx.database.add('cron', {
                time,
                assignee: session.bot.self_id,
                interval,
                command,
                session: session,
            })
            prepareCron(cron.toJSON(), session.bot.self_id, session)
            return `日程已创建，编号为 ${cron.toJSON().id}。`
        })
}
