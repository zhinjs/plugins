import {Context, Schema, useOptions} from "zhin";
import {resolve} from 'path'
import {AuthService} from './authService'
export {UserAuth,UserLogin,UserUpdate} from'./authService'
import '@zhinjs/plugin-console'
import {PluginService} from "./pluginService";
export const using=['console']
export const Config=Schema.object({
    authTokenExpire:Schema.number(),
    loginTokenExpire:Schema.number()
})
export function install(ctx:Context){
    const config=Config(useOptions('services.consoleAuth'))
    ctx.console.addEntry(resolve(__dirname,'../client/index.ts'))
    ctx.service('console.user',new AuthService(this,ctx,config))
    ctx.service('console.plugins',new PluginService(this,ctx))
}