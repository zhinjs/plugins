import {Awaitable, omit, pick, Time, Context} from 'zhin'
import { DataService, SocketHandle } from '@zhinjs/plugin-console'
import {UserTable,DataTypes} from '@zhinjs/plugin-database'
import { v4 } from 'uuid'

declare module '@zhinjs/plugin-database' {
    namespace UserTable {
        interface Types{
            password: string
            token: string
            expire: number
        }
    }
}

declare module '@zhinjs/plugin-console' {
    interface SocketHandle {
        user?: UserAuth
    }

    namespace Console {
        interface Services {
            user: AuthService
        }
    }

    interface Events {
        'login/captcha'(this: SocketHandle, user_id:number): Awaitable<UserLogin>
        'login/password'(this: SocketHandle, user_id: number, password: string): void
        'login/token'(this: SocketHandle, user_id: number, token: string): void
        'user/update'(this: SocketHandle, data: UserUpdate): void
        'user/logout'(this: SocketHandle): void
    }
}

export type UserAuth = Pick<UserTable.Types, 'user_id' | 'name' | 'authority' | 'token' | 'expire'>
export type UserLogin = Pick<UserTable.Types, 'user_id' | 'name' | 'token' | 'expire'>
export type UserUpdate = Partial<Pick<UserTable.Types, 'name' | 'password'>>

const authFields = ['name', 'authority', 'user_id', 'expire', 'token'] as (keyof UserAuth)[]

function setAuthUser(handle: SocketHandle, value: UserAuth) {
    handle.user = value
    handle.send({ type: 'data', body: { key: 'user', value } })
    handle.refresh()
    return true
}

export class AuthService extends DataService<UserAuth> {
    static using = ['console', 'database'] as const

    constructor(ctx:Context, private config: AuthService.Config) {
        super(ctx, 'user')
        if(ctx.database){
            ctx.database.extend('User', {
                password: DataTypes.STRING,
                token: DataTypes.TEXT,
                expire: DataTypes.BIGINT,
            })
        }
        ctx.disposes.push(ctx.zhin.on('database-created',()=>{
            ctx.database.extend('User', {
                password: DataTypes.STRING,
                token: DataTypes.TEXT,
                expire: DataTypes.BIGINT,
            })
        }))
        this.initLogin()
    }

    initLogin() {
        const { ctx, config={loginTokenExpire:Time.minute*10,authTokenExpire:Time.week}}  = this
        const states: Record<string, [string, number, SocketHandle]> = {}

        ctx.console.addListener('login/password', async function (user_id, password) {
            const userInstance = await ctx.database.model('User').findOne({where:{user_id},attributes:['id','password', ...authFields]})
            if(!userInstance)throw new Error('用户名错误。')
            const user=userInstance.toJSON() as UserTable.Types
            if (!user || user.password !== password) throw new Error('密码错误。')
            if (!user.expire || user.expire < Date.now()) {
                user.token = v4()
                user.expire = Date.now() + config.authTokenExpire
                await userInstance.update(pick(user, ['token', 'expire']))
            }
            setAuthUser(this, omit(user, ['password']))
        })

        ctx.console.addListener('login/token', async function (user_id, token) {
            const userInstance = await ctx.database.model('User').findOne({where:{user_id},attributes:authFields})
            if (!userInstance) throw new Error('用户不存在。')
            const user=userInstance.toJSON() as UserTable.Types
            if (user.token !== token || user.expire <= Date.now()) throw new Error('令牌已失效。')
            setAuthUser(this, user)
        })

        ctx.console.addListener('login/captcha', async function (user_id) {
            const userInstance = await ctx.database.model('User').findOne({where:{user_id}})
            if (!userInstance) throw new Error('找不到此账户。')
            const user=userInstance.toJSON()
            const token = v4()
            const expire = Date.now() + config.loginTokenExpire
            states[user_id] = [token, expire, this]

            const listener = () => {
                delete states[user_id]
                dispose()
                this.socket.removeEventListener('close', listener)
            }
            const dispose = ctx.setTimeout(() => {
                if (states[user_id]?.[1] >= Date.now()) listener()
            }, config.loginTokenExpire)
            this.socket.addEventListener('close', listener)

            return { user_id: user.user_id, name: user.name, token, expire }
        })

        ctx.middleware(async (session,next) => {
            const state = states[session.user_id]
            if (state && state[0] === session.elements.join('')) {
                const user=session.friend||session.member||session.user
                if (!user.expire || user.expire < Date.now()) {
                    user.token = v4()
                    user.expire = Date.now() + config.authTokenExpire
                    await ctx.database.model("User").update({token:user.token,expire:user.expire},{where:{user_id:user.user_id}})
                }
                return setAuthUser(state[2], omit(user,['password']))
            }
            next()
        })

        ctx.on('console/intercept', (handle, listener) => {
            if (!listener.authority) return false
            if (!handle.user) return true
            if (handle.user.expire <= Date.now()) return true
            return handle.user.authority < listener.authority
        })

        ctx.console.addListener('user/logout', async function () {
            if(!this.user.user_id) return
            delete states[this.user.user_id]
            setAuthUser(this, null)
        })

        ctx.console.addListener('user/update', async function (data) {
            if (!this.user) throw new Error('请先登录。')
            await ctx.database.model('User').update(data,{where: {user_id: this.user.user_id}})
        })
    }
}

namespace AuthService {
    export interface Config {
        authTokenExpire?: number
        loginTokenExpire?: number
    }
}