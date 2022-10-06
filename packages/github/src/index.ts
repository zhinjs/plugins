import {Bot, sanitize, Dict, Random, camelize, ChannelId, deepClone} from "zhin";
import '@zhinjs/plugin-database'
import '@zhinjs/plugin-http'
import {EventConfig,addListeners,defaultEvents,CommonPayload} from "./events";
import {GitHub,Config,ReplyHandler} from "./serve";
import {encode} from "querystring";
import {Method} from "axios";
import {GroupMessageEvent} from "icqq";
import {genGroupMessageId} from 'icqq/lib/message'
import {createHmac} from "crypto";
declare module 'zhin'{
    namespace Bot{
        interface Services{
            github:GitHub
        }
    }
}
export const name='github'
export const using=['database','http','utils','prompt']
export function install(bot:Bot,config:Config){
    config.path=sanitize(config.path)
    const { database } = bot
    const { appId, redirect } = config
    const subscriptions: Dict<Dict<EventConfig>> = {}
    bot.service('github',GitHub,config)
    const tokens: Dict<number> = Object.create(null)
    bot.router.get(config.path + '/authorize', async (_ctx) => {
        const token = _ctx.query.state
        if (!token || Array.isArray(token)) return _ctx.status = 400
        const id = tokens[token]
        if (!id) return _ctx.status = 403
        delete tokens[token]
        const { code, state } = _ctx.query
        const data = await bot.github.getTokens({ code, state, redirect_uri: redirect })
        await database.model('User').update({
            github_accessToken:data.access_token,
            github_refreshToken: data.refresh_token,
        },{where:{id}})
        return _ctx.status = 200
    })
    bot.command('github [name]',"group")
        .alias('gh')
        .check(({event})=>{
            if(bot.isAdmin(event.sender.user_id) || bot.isMaster(event.sender.user_id))return
            return '权限不足'
        })
        .option('list', '-l')
        .option('add', '-a')
        .option('delete', '-d')
        .action(async ({ event, options }, name) => {
            if (options.list) {
                const names = Object.keys(event.group.github_webhooks||{})
                if (!names.length) return '当前没有监听仓库'
                return names.sort().join('\n')
            }

            if (options.add || options.delete) {
                if (!name) return '请输入仓库名'
                if (!repoRegExp.test(name)) return '仓库名无效'

                name = name.toLowerCase()
                const github_webhooks = event.group.github_webhooks
                if (options.add) {
                    if (github_webhooks[name]) return '已添加过仓库 '+ name
                    const [repo] = await bot.database.get('github', { name: [name] })
                    if (!repo) {
                        const dispose = bot.middleware(({ cqCode }, next) => {
                            dispose()
                            cqCode = cqCode.trim()
                            if (cqCode && cqCode !== '.' && cqCode !== '。') return next()
                            return bot.execute({
                                name: 'github.repos',
                                event,
                                args: [name],
                                options: { add: true, subscribe: true },
                            })
                        })
                        return `尚未添加过仓库 ${name}。发送空行或句号以立即添加并订阅该仓库`
                    }
                    github_webhooks[name] = deepClone(defaultEvents)
                    await bot.database.set('Group',{group_id:event.group_id},{github_webhooks})
                    subscribe(name, event.group_id, github_webhooks[name])
                    return '添加成功'
                } else if (options.delete) {
                    if (!github_webhooks[name]) return '尚未在当前群聊订阅过仓库'+ name
                    delete github_webhooks[name]
                    await bot.database.set('Group',{group_id:event.group_id},{github_webhooks})
                    unsubscribe(name, event.group_id)
                    return '删除成功'
                }
            }

            return bot.execute({event,name:'help',args:['github']})
        })
    bot.command('github/github.authorize <user>','group')
        .alias('github.auth')
        .action(async ({ event }, user) => {
            if (!user) return '请输入用户名'
            const token = Random.id()
            tokens[token] = event.member.id
            const url = 'https://github.com/login/oauth/authorize?' + encode({
                client_id: appId,
                state: token,
                redirect_uri: redirect,
                scope: 'admin:repo_hook,repo',
                login: user,
            })
            return '点击下面的链接继续操作：\n' + url
        })
    const repoRegExp = /^[\w.-]+\/[\w.-]+$/

    bot.command('github/github.repos [name:string]',"group")
        .option('add', '-a')
        .option('delete', '-d')
        .option('subscribe', '-s')
        .action(async ({ event, options }, name) => {
            if (options.add || options.delete) {
                if (!name) return '请输入仓库名'
                if (!repoRegExp.test(name)) return '仓库名无效'
                if (!event.member.github_accessToken) {
                    return bot.github.authorize(event, '要使用此功能，请对机器人进行授权。输入你的 GitHub 用户名。')
                }

                name = name.toLowerCase()
                const url = `https://api.github.com/repos/${name}/hooks`
                const [repo] = await bot.database.get('github', { name: [name] })
                if (options.add) {
                    if (repo) return '重复添加'
                    const secret = Random.id()
                    let data: any
                    try {
                        data = await bot.github.request('POST', url, event, {
                            events: ['*'],
                            config: {
                                secret,
                                url: bot.options.plugins.http.selfUrl + config.path + '/webhook',
                            },
                        })
                    } catch (err) {
                        if (!err.response) throw err
                        if (err.response.status === 404) {
                            return '未找到仓库 '+name
                        } else if (err.response.status === 403) {
                            return '访问受限'
                        } else {
                            bot.logger.warn(err)
                            return '添加失败'
                        }
                    }
                    await bot.database.add('github', { name, id: data.id, secret })
                    if (!options.subscribe) return '添加成功'
                    return bot.execute({
                        name: 'github',
                        event,
                        args: [name],
                        options: { add: true },
                    })
                } else {
                    if (!repo) return '删除失败'
                    try {
                        await bot.github.request('DELETE', `${url}/${repo.toJSON().id}`, event)
                    } catch (err) {
                        if ( !err.response) throw err
                        if (err.response.status !== 404) {
                            bot.logger.warn(err)
                            return '删除失败'
                        }
                    }

                    async function updateChannels() {
                        const groups = await bot.database.get('Group')
                        for(const group of groups){
                            const {github_webhooks} = group.toJSON()
                            if(!github_webhooks) continue
                            const shouldUpdate = github_webhooks[name]
                            delete github_webhooks[name]
                            if(shouldUpdate){
                                await group.update({github_webhooks})
                            }
                        }
                    }

                    unsubscribe(name)
                    await Promise.all([
                        updateChannels(),
                        bot.database.delete('github', { name: [name] }),
                    ])
                    return '删除成功'
                }
            }

            const repos = await bot.database.get('github', {})
            if (!repos.length) return '当前没有监听的仓库'
            return repos.map(repo => repo.toJSON().name).join('\n')
        })
    function subscribe(repo: string, group_id: number, meta: EventConfig) {
        (subscriptions[repo] ||= {})[group_id] = meta
    }

    function unsubscribe(repo: string, group_id?: number) {
        if (!group_id) return delete subscriptions[repo]
        delete subscriptions[repo][group_id]
        if (!Object.keys(subscriptions[repo]).length) {
            delete subscriptions[repo]
        }
    }
    async function request(method: Method, url: string, event: GroupMessageEvent, body: any, message: string) {
        return bot.github.request(method, 'https://api.github.com' + url, event, body)
            .then(() => message + '成功')
            .catch((err) => {
                bot.logger.warn(err)
                return message + '失败'
            })
    }
    bot.command('github/github.issue [title] [body:text]',"group")
        .option('repo', '-r [repo:string]')
        .action(async ({ event, options }, title, body) => {
            if (!options.repo) return '请输入仓库名'
            if (!repoRegExp.test(options.repo)) return '仓库名无效'
            if (!event.member.github_accessToken) {
                return bot.github.authorize(event, '要使用此功能，请对机器人进行授权。输入你的 GitHub 用户名。')
            }

            return request('POST', `/repos/${options.repo}/issues`, event, {
                title,
                body,
            }, '创建')
        })
    bot.command('github/github.star [repo]',"group")
        .option('repo', '-r [repo:string]')
        .action(async ({ event, options }) => {
            if (!options.repo) return '请输入仓库名'
            if (!repoRegExp.test(options.repo)) return '仓库名无效'
            if (!event.member.github_accessToken) {
                return bot.github.authorize(event, '要使用此功能，请对机器人进行授权。输入你的 GitHub 用户名。')
            }

            return request('PUT', `/user/starred/${options.repo}`, event, null, '操作')
        })
    bot.after('ready', async () => {
        const channels = await bot.database.get('Group')
        for (const channel of channels) {
            const { github_webhooks,group_id }=channel.toJSON()
            if(!github_webhooks) continue
            for (const repo in github_webhooks) {
                subscribe(repo, group_id, github_webhooks[repo])
            }
        }
    })
    const reactions = ['+1', '-1', 'laugh', 'confused', 'heart', 'hooray', 'rocket', 'eyes']

    function safeParse(source: string) {
        try {
            return JSON.parse(source)
        } catch {}
    }

    bot.router.post(config.path + '/webhook', async (_ctx) => {
        const event = _ctx.headers['x-github-event']
        const signature = _ctx.headers['x-hub-signature-256']
        const id = _ctx.headers['x-github-delivery']
        const webhookId = +_ctx.headers['x-github-hook-id']
        const payload = safeParse(_ctx.request.body.payload)
        if (!payload) return _ctx.status = 400
        const fullEvent = payload.action ? `${event}/${payload.action}` : event
        bot.logger.debug('received %s (%s)', fullEvent, id)
        const [data] = await database.get('github', {id:webhookId})
        // 202：服务器已接受请求，但尚未处理
        // 在 github.repos -a 时确保获得一个 2xx 的状态码
        if (!data) return _ctx.status = 202
        if (signature !== `sha256=${createHmac('sha256', data.toJSON().secret).update(_ctx.request.rawBody).digest('hex')}`) {
            return _ctx.status = 403
        }
        const fullName = payload.repository.full_name.toLowerCase()

        if (data.toJSON().name !== fullName) {
            // repo renamed
            await database.set('github', {id:webhookId}, { name: fullName, secret: data.toJSON().secret })

            unsubscribe(data.toJSON().name)
            const groups = await bot.database.get('Group')
            for(const group of groups){
                const {github_webhooks,group_id}=group.toJSON()
                if(!github_webhooks) continue
                const shouldUpdate = github_webhooks[data.toJSON().name]
                if (shouldUpdate) {
                    github_webhooks[fullName] = shouldUpdate
                    subscribe(fullName, group_id, github_webhooks[fullName])
                    delete github_webhooks[data.toJSON().name]
                    await group.update({github_webhooks})
                }
            }
        }
        _ctx.status = 200
        if (payload.action) {
            bot.emit(`github/${fullEvent}`, payload)
        }
        bot.emit(`github/${event}`, payload)
    })
    bot.middleware((session, next) => {
        if (!session.source || session.message_type!=='group') return next()
        const body = (session.source.message as string).trim()
        const payloads = bot.github.history[genGroupMessageId(session.group_id,session.sender.user_id,session.source.seq,session.source.rand,session.source.time)]
        if (!body || !payloads) return next()

        let name: string, message: string
        name = reactions.includes(body) ? 'react' : 'reply'
        message = body

        const payload = payloads[name]
        if (!payload) return next()
        const handler = new ReplyHandler(bot.github, session, message)
        return handler[name](...payload)
    })

    addListeners((event, handler) => {
        const base = camelize(event.split('/', 1)[0])
        bot.on(`github/${event}` as any, async (payload: CommonPayload) => {
            // step 1: filter event
            const repoConfig = subscriptions[payload.repository.full_name.toLowerCase()] || {}
            console.log('repoConfig',repoConfig)
            const targets = Object.keys(repoConfig).filter((id) => {
                const baseConfig = repoConfig[id][base] || deepClone(defaultEvents)
                if (baseConfig === false) return
                // payload.action may be undefined
                if (payload.action && baseConfig !== true) {
                    const action = camelize(payload.action)
                    const actionConfig = baseConfig[action]
                    if (actionConfig === false) return
                    if (actionConfig !== true && !(defaultEvents[base] || {})[action]) return
                }
                return true
            })
            if (!targets.length) return

            // step 2: handle event
            const result = handler(payload as any)
            if (!result) return
            // step 3: broadcast message
            bot.logger.info('broadcast', result[0])
            const messageIds = await bot.broadcast([`group:${targets}`] as ChannelId[], (config.messagePrefix || '[GitHub]') + result[0])

            // step 4: save message ids for interactions
            for (const id of messageIds) {
                bot.github.history[id] = result[1]
            }

            bot.setTimeout(() => {
                for (const id of messageIds) {
                    delete bot.github.history[id]
                }
            }, config.replyTimeout)
        })
    })
}