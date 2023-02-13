import {TriggerSessionMap, Context, ChannelId, useOptions, Schema} from 'zhin'
import RssFeedEmitter from 'rss-feed-emitter'
import {Meta} from 'feedparser'
import {Feed} from "./models";

export const name = 'rss'
export const using = ['database'] as const

export interface Config {
    timeout?: number
    refresh?: number
    userAgent?: string
}
export const Config=Schema.object({
    timeout:Schema.number(),
    refresh:Schema.number(),
    userAgent:Schema.string()
})
export function install(ctx: Context) {
    const config=Config(useOptions('plugins.rss'))
    if(ctx.database){
        ctx.database.define('Rss',Feed.table)
    }else{
        ctx.app.on('database-created',()=>{
            ctx.database.define('Rss',Feed.table)
        })
    }
    const {timeout, refresh, userAgent} = config||{timeout:1000,refresh:10*1000,userAgent:''}
    const feedMap: Record<string, Set<ChannelId>> = {}
    const feeder = new RssFeedEmitter({skipFirstLoad: true, userAgent})
    const callbackMap:Record<string, Function>={}
    function subscribe(url: string, msgChannelId: ChannelId,template?:string) {
        if(template){
            callbackMap[url]=function (this:Meta){
                return template.replace(/(\{\{.+}})/g,(substring)=>{
                    return this[substring]
                })
            }
        }
        if (url in feedMap) {
            feedMap[url].add(msgChannelId)
        } else {
            feedMap[url] = new Set([msgChannelId])
            feeder.add({url, refresh})
            ctx.logger.debug('subscribe', url)
        }
    }

    function unsubscribe(url: string, msgChannelId: ChannelId) {
        feedMap[url].delete(msgChannelId)
        if (!feedMap[url].size) {
            delete feedMap[url]
            feeder.remove(url)
            ctx.logger.debug('unsubscribe', url)
        }
    }

    ctx.on('dispose', () => {
        feeder.destroy()
    })
    feeder.on('error', (err: Error) => {
        ctx.logger.debug(err.message)
    })
    ctx.once('start', async () => {
        const rssList = await ctx.database.get('Rss')
        for (const rss of rssList) {
            const rssInfo=rss.toJSON()
            subscribe(rssInfo.url, `${rssInfo.target_type}:${rssInfo.target_id}` as ChannelId,rssInfo.callback)
        }
    })
    const validators: Record<string, Promise<unknown>> = {}

    async function validate(url: string, session: TriggerSessionMap[keyof TriggerSessionMap]) {
        if (validators[url]) {
            await session.reply('正在尝试连接……')
            return validators[url]
        }

        let timer: NodeJS.Timeout
        const feeder = new RssFeedEmitter({userAgent})
        return validators[url] = new Promise((resolve, reject) => {
            // rss-feed-emitter's typings suck
            feeder.add({url, refresh: 1 << 30})
            feeder.on('new-item', resolve)
            feeder.on('error', reject)
            timer = setTimeout(() => reject(new Error('connect timeout')), timeout)
        }).finally(() => {
            feeder.destroy()
            clearTimeout(timer)
            delete validators[url]
        })
    }

    feeder.on('new-item', async (payload) => {
        ctx.logger.debug('receive', payload.title)
        const source = payload.meta.link
        if (!feedMap[source]) return
        const message = callbackMap[source]?callbackMap[source].apply({...payload}):`${payload.meta.title} (${payload.author})\n${payload.title}\n${payload.link}`
        await ctx.broadcast([...feedMap[source]], message)
    })
    ctx.command('rss <title:string> <url:string>')
        .desc('订阅 RSS 链接')
        .option('list', '-l 查看订阅列表')
        .option('template','-t <text> 定义输出模板')
        .option('remove', '-r 取消订阅')
        .action(async ({session,bot, options}, title,url) => {
            let target_id
            if ("group_id" in session) {
                target_id = session.group_id
            } else if('discuss_id' in session){
                target_id=session.discuss_id
            }else {
                 target_id=session.user_id
            }
            const channelId=`${session.protocol}:${session.bot.self_id}:${session.detail_type}:${target_id}` as ChannelId
            const rssList = (await ctx.database.models.Rss.findAll({
                where: {
                    target_id,
                    target_type: session.detail_type
                }
            })).map(item=>item.toJSON())
            if (options.list) {
                if (!rssList.length) return '未订阅任何链接。'
                return rssList.map((rss,index)=>`${rss.title}:${rss.url}`).join('\n')
            }

            const index = rssList.findIndex(rss=>rss.url===url)

            if (options.remove) {
                if (index < 0) return '未订阅此链接。'
                if(session.user_id!==rssList[index].creator_id && bot.isMaster(session)) return '权限不足'
                await ctx.database.models.Rss.destroy({
                    where:{
                        url,
                        target_id,
                        target_type:session.detail_type,
                    }
                })
                unsubscribe(url, channelId)
                return '取消订阅成功！'
            }

            if (index >= 0) return '已订阅此链接。'
            return validate(url, session).then(async () => {
                subscribe(url, channelId,options.template)
                await ctx.database.models.Rss.create({
                    url,
                    target_id,
                    title,
                    target_type:session.detail_type,
                    template:options.template||null,
                    creator_id:session.user_id
                })
                return '添加订阅成功！'
            }, (error) => {
                ctx.logger.debug(error)
                return '无法订阅此链接。'
            })
        })
}
