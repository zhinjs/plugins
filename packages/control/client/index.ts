import {Context,store,send,message,router,defineExtension} from "@zhinjs/client";
import { config } from './utils'
import Login from './pages/login.vue'
import Profile from './tookit/profile.vue'

export default defineExtension((ctx:Context)=>{
    // 在这儿添加路由
    if (config.token && config.expire > Date.now()) {
        send('login/token', Number(config.userId), config.token).catch(e => {
            message.error(typeof e==='string'?e:e.message)
        })
    }
    ctx.disposables.push(
        router.beforeEach((route) => {
            if ((route.meta.authority || route.meta.fields.includes('user')) && !store.user) {
                // handle router.back()
                return history.state.forward === '/login' ? '/' : '/login'
            }

            if (route.meta.authority && route.meta.authority > store.user.authority) {
                message.error('权限不足。')
                return false
            }
        }))

    ctx.addPage({
        path: '/login',
        name: '登录',
        icon: 'avatar',
        position: 'hidden',
        component: Login,
    })
    ctx.addPage({
        path:'/bot',
        name:'机器人配置',
        icon:'tools',
        fields:['user'],
        position:'left',
        component:()=>import('./pages/bot.vue')
    })
    ctx.addToolkit({
        name: '用户资料',
        icon: 'user',
        component: Profile,
    })
})