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

    bot.on('after-ready', async () => {
        const crons = await bot.database.get('cron',{assignee:bot.uin})
        crons.forEach((cron) => {
            const schedule=cron.toJSON()
            const { event } = schedule
            prepareCron(schedule, event)
        })
    })

    bot.command('cron [time]')
        .desc('????????????')
        .option('rest', '-- <command:text>  ??????????????????')
        .option('interval', '/ <interval:string>  ???????????????????????????')
        .option('list', '-l  ???????????????????????????')
        .option('ensure', '-e  ???????????????????????????')
        .option('full', '-f  ?????????????????????')
        .option('delete', '-d <id>  ???????????????????????????')
        .action(async ({ event, options }, ...dateSegments) => {
            if (options.delete) {
                await bot.database.delete('cron',{id:options.delete})
                return `?????? ${options.delete} ????????????`
            }

            if (options.list) {
                let schedules = (await bot.database.get('cron')).map(t=>t.toJSON())
                if (!options.full) {
                    schedules = schedules.filter((s) => isSameEnv(s.event,event))
                }
                if (!schedules.length) return '????????????????????????????????????'
                return schedules.map(({ id, time, interval, command, session }) => {
                    let output = `${id}. ${Time.formatTimeInterval(time, interval)}???${command}`
                    if (options.full) output += `???????????????${formatContext(session)}`
                    return output
                }).join('\n')
            }

            if (!options.rest) return '??????????????????????????????'

            const dateString = dateSegments.join('-')
            const time = Time.parseDate(dateString)
            const timestamp = +time
            if (Number.isNaN(timestamp) || timestamp > 2147483647000) {
                if (/^\d+$/.test(dateString)) {
                    return `??????????????????????????????????????????????????? ${dateString}s???`
                } else {
                    return '???????????????????????????'
                }
            } else if (!options.interval) {
                if (!dateString) {
                    return '????????????????????????'
                } else if (timestamp <= Date.now()) {
                    return '?????????????????????????????????????????????'
                }
            }

            const interval = Time.parseTime(options.interval)
            if (!interval && options.interval) {
                return '?????????????????????????????????'
            } else if (interval && interval < (config.minInterval||=60000)) {
                return '?????????????????????'
            }

            const [cron] = await bot.database.add('cron',{
                time,
                assignee: bot.uin,
                interval,
                command: options.rest,
                event: event,
            })
            prepareCron(cron.toJSON(), event)
            return `??????????????????????????? ${cron.toJSON().id}???`
        })
}
