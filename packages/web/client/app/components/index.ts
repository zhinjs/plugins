import { App } from 'vue'
import {
    ElLoading,
    ElMessage,
} from 'element-plus'
import ElementUI from 'element-plus'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import View from './view'
import 'element-plus/dist/index.css'
import './style.scss'
import codeMirror from 'vue-codemirror'
import {basicSetup} from 'codemirror'
import {javascript} from '@codemirror/lang-javascript'
import {json} from '@codemirror/lang-json'
export const loading = ElLoading.service
export const message = ElMessage



export default function (app: App) {
    for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
        app.component(key, component)
    }
    app.use(codeMirror,{
        autofocus:true,
        disabled:false,
        indentWithTab:true,
        tabSize:2,
        placeholder:'start with type code here...',
        extensions:[basicSetup,javascript(),json()]
    })
    app.use(ElementUI, { size: 'small', zIndex: 3000 })
    app.component('k-view', View)
}
