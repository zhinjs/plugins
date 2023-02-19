import {Context, Schema, useOptions} from "zhin";
import {resolve} from 'path'
import {AuthService} from './authService'
export {UserAuth,UserLogin,UserUpdate} from'./authService'
import '@zhinjs/plugin-console'
import {ConfigService} from "./configService";
export const using=['console']
export const Config=Schema.object({
    authTokenExpire:Schema.number(),
    loginTokenExpire:Schema.number()
})
export function install(ctx:Context){
    const config=Config(useOptions('services.consoleAuth'))
    ctx.console.addEntry(resolve(__dirname,'../client/index.ts'))
    ctx.service('console.user',new AuthService(ctx,config))
    ctx.service('console.config',new ConfigService(ctx))
}