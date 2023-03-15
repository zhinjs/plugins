import { createApp } from 'vue'
import components from './components'
import { config, connect, router } from '@zhinjs/client'
import Blank from './layouts/blank.vue'
import App from './layouts/index.vue'
import './index.scss'
const app = createApp(App)

app.use(components)

app.provide('ecTheme', 'dark-blue')

router.addRoute({
    path: '/blank',
    component: Blank,
    meta: { fields: [], position: 'hidden' },
})

app.use(router)

router.afterEach((route) => {
    if (typeof route.name === 'string') {
        document.title = `${route.name} | 控制台`
    }
})

const endpoint = new URL(config.endpoint, location.origin).toString()
connect(endpoint.replace(/^http/, 'ws')).then(()=>{
    console.log('已连接服务端')
})

app.mount('#app')
