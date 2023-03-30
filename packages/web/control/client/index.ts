import {ZhinWeb,store,send,message,router,defineExtension} from "@zhinjs/client";
import { config } from './utils'
import Profile from "./toolkit/profile.vue";
export default defineExtension((web:ZhinWeb)=>{
    send('config')
    // 在这儿添加路由
    if (config.token && config.expire > Date.now()) {
        send('login/token', Number(config.userId), config.token).catch(e => {
            message.error(typeof e==='string'?e:e.message)
        })
    }
    web.disposables.push(
        router.beforeEach((route) => {
            if ((route.meta.authority || route.meta.fields.includes('user')) && !store.user) {
                return history.state.forward === '/login' ? '/' : '/login'
            }

            if (route.meta.authority && route.meta.authority > store.user.authority) {
                message.error('权限不足。')
                return false
            }
        }))

    web.addPage({
        path: '/login',
        name: '登录',
        icon: 'avatar',
        position: 'hidden',
        component: ()=>import('./pages/login.vue'),
    })
    web.addPage({
        path:'/config',
        name:'配置管理',
        icon:'tools',
        authority:7,
        fields:['config'],
        position:'left',
        component:()=>import('./pages/config.vue')
    })
    web.addToolkit({
        name: '用户资料',
        icon: 'user',
        component:Profile,
    })
})