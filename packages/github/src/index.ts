import {Session, Context, sanitize, Dict, h, Random, camelize, deepClone, useOptions} from "zhin";
import '@zhinjs/plugin-database'
import {EventConfig, addListeners, defaultEvents, CommonPayload} from "./events";
import {GitHub, Config, ReplyHandler} from "./serve";
import {encode} from "querystring";
import {Method} from "axios";
import {createHmac} from "crypto";

declare module 'zhin' {
    namespace Zhin {
        interface Services {
            github: GitHub
        }
    }
}
export const using = ['database']

export function install(ctx: Context) {
    ctx.middleware(async (session, next) => {
        await next()
        const mathReg = /^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/]+)\/([^/]+)\/?$/
        const match = session.elements.join('').match(mathReg)
        if (!match) return
        const [, owner, repo] = match
        const src = `https://opengraph.github.com/repo/${owner}/${repo}`
        session.reply(h('image', {src}))
    })
    const config = Config(useOptions('services.github'))
    if (!config) return
    config.path = sanitize(config.path)
    const {database} = ctx
    const {appId, redirect} = config
    const subscriptions: Dict<Dict<EventConfig>> = {}
    ctx.service('github', GitHub, config)
    const tokens: Dict<number> = Object.create(null)
    ctx.router.get(config.path + '/authorize', async (_ctx) => {
        const token = _ctx.query.state
        if (!token || Array.isArray(token)) return _ctx.status = 400
        const id = tokens[token]
        if (!id) return _ctx.status = 403
        delete tokens[token]
        const {code, state} = _ctx.query
        const data = await ctx.github.getTokens({code, state, redirect_uri: redirect})
        if (ctx.database.isReady) {
            await database.model('User').update({
                github_accessToken: data.access_token,
                github_refreshToken: data.refresh_token,
            }, {where: {id}})
        } else {
            ctx.disposes.push(
                ctx.app.on('database-ready', async () => {
                    await database.model('User').update({
                        github_accessToken: data.access_token,
                        github_refreshToken: data.refresh_token,
                    }, {where: {id}})
                }))
        }
        return _ctx.status = 200
    })
    ctx.command('github [name:string]', "group")
        .desc('github仓库管理指令')
        .alias('gh')
        .auth('master', "admins")
        .option('list', '-l')
        .option('add', '-a')
        .option('delete', '-d')
        .action(async ({session, options}, name) => {
            if (options.list) {
                const names = Object.keys(session.group.github_webhooks || {})
                if (!names.length) return '当前没有监听仓库'
                return names.sort().join('\n')
            }

            if (options.add || options.delete) {
                if (!name) return '请输入仓库名'
                if (!repoRegExp.test(name)) return '仓库名无效'

                name = name.toLowerCase()
                const github_webhooks = session.group.github_webhooks
                if (options.add) {
                    if (github_webhooks[name]) return '已添加过仓库 ' + name
                    const [repo] = await ctx.database.get('github', {name: [name]})
                    if (!repo) {
                        const dispose = ctx.middleware((session2, next) => {
                            dispose()
                            const cqCode = session2.elements.join('')
                            if (cqCode && cqCode !== '.' && cqCode !== '。') return next()
                            return session.execute({
                                name: 'github.repos',
                                session,
                                args: [name],
                                options: {add: true, subscribe: true},
                            })
                        })
                        return `尚未添加过仓库 ${name}。发送空行或句号以立即添加并订阅该仓库`
                    }
                    github_webhooks[name] = deepClone(defaultEvents)
                    await ctx.database.set('Group', {group_id: session.group_id}, {github_webhooks})
                    subscribe(name, session.group_id, github_webhooks[name])
                    return '添加成功'
                } else if (options.delete) {
                    if (!github_webhooks[name]) return '尚未在当前群聊订阅过仓库' + name
                    delete github_webhooks[name]
                    await ctx.database.set('Group', {group_id: session.group_id}, {github_webhooks})
                    unsubscribe(name, session.group_id)
                    return '删除成功'
                }
            }

            return session.execute({session, name: 'help', args: ['github']})
        })
    ctx.command('github/github.authorize <user:string>', 'group')
        .alias('github.auth')
        .action(async ({session}, user) => {
            if (!user) return '请输入用户名'
            const token = Random.id()
            tokens[token] = session.user_id
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

    ctx.command('github/github.repos [name:string]', "group")
        .option('add', '-a')
        .option('delete', '-d')
        .option('subscribe', '-s')
        .action(async ({session, options}, name) => {
            if (options.add || options.delete) {
                if (!name) return '请输入仓库名'
                if (!repoRegExp.test(name)) return '仓库名无效'
                if (!session.user.github_accessToken) {
                    return ctx.github.authorize(session, '要使用此功能，请对机器人进行授权。输入你的 GitHub 用户名。')
                }

                name = name.toLowerCase()
                const url = `https://api.github.com/repos/${name}/hooks`
                const [repo] = await ctx.database.get('github', {name: [name]})
                if (options.add) {
                    if (repo) return '重复添加'
                    const secret = Random.id()
                    let data: any
                    try {
                        data = await ctx.github.request('POST', url, session, {
                            events: ['*'],
                            config: {
                                secret,
                                url: ctx.app.options.plugins.http.selfUrl + config.path + '/webhook',
                            },
                        })
                    } catch (err) {
                        if (!err.response) throw err
                        if (err.response.status === 404) {
                            return '未找到仓库 ' + name
                        } else if (err.response.status === 403) {
                            return '访问受限'
                        } else {
                            ctx.logger.warn(err)
                            return '添加失败'
                        }
                    }
                    await ctx.database.add('github', {name, id: data.id, secret})
                    if (!options.subscribe) return '添加成功'
                    return session.execute({
                        name: 'github',
                        session,
                        args: [name],
                        options: {add: true},
                    })
                } else {
                    if (!repo) return '删除失败'
                    try {
                        await ctx.github.request('DELETE', `${url}/${repo.toJSON().id}`, session)
                    } catch (err) {
                        if (!err.response) throw err
                        if (err.response.status !== 404) {
                            ctx.logger.warn(err)
                            return '删除失败'
                        }
                    }

                    async function updateChannels() {
                        const groups = await ctx.database.get('Group')
                        for (const group of groups) {
                            const {github_webhooks} = group.toJSON()
                            if (!github_webhooks) continue
                            const shouldUpdate = github_webhooks[name]
                            delete github_webhooks[name]
                            if (shouldUpdate) {
                                await group.update({github_webhooks})
                            }
                        }
                    }

                    unsubscribe(name)
                    await Promise.all([
                        updateChannels(),
                        ctx.database.delete('github', {name: [name]}),
                    ])
                    return '删除成功'
                }
            }

            const repos = await ctx.database.get('github', {})
            if (!repos.length) return '当前没有监听的仓库'
            return repos.map(repo => repo.toJSON().name).join('\n')
        })

    function subscribe(repo: string, group_id: number | string, meta: EventConfig) {
        (subscriptions[repo] ||= {})[group_id] = meta
    }

    function unsubscribe(repo: string, group_id?: string | number) {
        if (!group_id) return delete subscriptions[repo]
        delete subscriptions[repo][group_id]
        if (!Object.keys(subscriptions[repo]).length) {
            delete subscriptions[repo]
        }
    }

    async function request(method: Method, url: string, session: Session, body: any, message: string) {
        return ctx.github.request(method, 'https://api.github.com' + url, session, body)
            .then(() => message + '成功')
            .catch((err) => {
                ctx.logger.warn(err)
                return message + '失败'
            })
    }

    ctx.command('github/github.issue [title] [body:text]', "group")
        .option('repo', '-r [repo:string]')
        .action(async ({session, options}, title, body) => {
            if (!options.repo) return '请输入仓库名'
            if (!repoRegExp.test(options.repo)) return '仓库名无效'
            if (!session.user.github_accessToken) {
                return ctx.github.authorize(session, '要使用此功能，请对机器人进行授权。输入你的 GitHub 用户名。')
            }

            return request('POST', `/repos/${options.repo}/issues`, session, {
                title,
                body,
            }, '创建')
        })
    ctx.command('github/github.star [repo]', "group")
        .option('repo', '-r [repo:string]')
        .action(async ({session, options}) => {
            if (!options.repo) return '请输入仓库名'
            if (!repoRegExp.test(options.repo)) return '仓库名无效'
            if (!session.user.github_accessToken) {
                return ctx.github.authorize(session, '要使用此功能，请对机器人进行授权。输入你的 GitHub 用户名。')
            }

            return request('PUT', `/user/starred/${options.repo}`, session, null, '操作')
        })
    ctx.disposes.push(ctx.on('database-ready', async () => {
        const channels = await ctx.database.get('Group')
        for (const channel of channels) {
            const {github_webhooks, group_id} = channel.toJSON()
            if (!github_webhooks) continue
            for (const repo in github_webhooks) {
                subscribe(repo, group_id, github_webhooks[repo])
            }
        }
    }))
    const reactions = ['+1', '-1', 'laugh', 'confused', 'heart', 'hooray', 'rocket', 'eyes']

    function safeParse(source: string) {
        try {
            return JSON.parse(source)
        } catch {
        }
    }

    ctx.router.post(config.path + '/webhook', async (_ctx) => {
        const event = _ctx.headers['x-github-event']
        const signature = _ctx.headers['x-hub-signature-256']
        const id = _ctx.headers['x-github-delivery']
        const webhookId = +_ctx.headers['x-github-hook-id']
        const payload = safeParse(_ctx.request.body.payload)
        if (!payload) return _ctx.status = 400
        const fullEvent = payload.action ? `${event}/${payload.action}` : event
        ctx.logger.debug('received %s (%s)', fullEvent, id)
        const [data] = await database.get('github', {id: webhookId})
        // 202：服务器已接受请求，但尚未处理
        // 在 github.repos -a 时确保获得一个 2xx 的状态码
        if (!data) return _ctx.status = 202
        if (signature !== `sha256=${createHmac('sha256', data.toJSON().secret).update(_ctx.request.rawBody).digest('hex')}`) {
            return _ctx.status = 403
        }
        const fullName = payload.repository.full_name.toLowerCase()

        if (data.toJSON().name !== fullName) {
            // repo renamed
            await database.set('github', {id: webhookId}, {name: fullName, secret: data.toJSON().secret})

            unsubscribe(data.toJSON().name)
            const groups = await ctx.database.get('Group')
            for (const group of groups) {
                const {github_webhooks, group_id} = group.toJSON()
                if (!github_webhooks) continue
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
            ctx.emit(`github/${fullEvent}`, payload)
        }
        ctx.emit(`github/${event}`, payload)
    })
    ctx.middleware((session, next) => {
        if (!session.quote || session.detail_type !== 'group') return next()
        const body = session.quote.element.join('')
        const payloads = ctx.github.history[session.quote.message_id]
        if (!body || !payloads) return next()

        let name: string, message: string
        name = reactions.includes(body) ? 'react' : 'reply'
        message = body

        const payload = payloads[name]
        if (!payload) return next()
        const handler = new ReplyHandler(ctx.github, session, message)
        return handler[name](...payload)
    })

    addListeners((event, handler) => {
        const base = camelize(event.split('/', 1)[0])
        ctx.on(`github/${event}` as any, async (payload: CommonPayload) => {
            // step 1: filter event
            const repoConfig = subscriptions[payload.repository.full_name.toLowerCase()] || {}
            const targets = Object.keys(repoConfig).filter((id) => {
                const baseConfig = repoConfig[id][base] || deepClone(defaultEvents)
                if (baseConfig === false) return
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
            ctx.logger.info('broadcast', result[0])
            const messageIds = await ctx.broadcast(`group:${targets}`, (config.messagePrefix || '[GitHub]') + result[0])

            // step 4: save message ids for interactions
            for (const {message_id} of messageIds) {
                ctx.github.history[message_id] = result[1]
            }

            ctx.setTimeout(() => {
                for (const {message_id} of messageIds) {
                    delete ctx.github.history[message_id]
                }
            }, config.replyTimeout)
        })
    })
}