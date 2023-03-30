import {Context, Schema, Time, useOptions} from "zhin";
import {resolve} from 'path'
import {AuthService} from './authService'
export {UserAuth,UserLogin,UserUpdate} from'./authService'
import '@zhinjs/plugin-console'
import {ConfigService} from "./configService";
export const using=['console']
export const Config=Schema.object({
    authTokenExpire:Schema.number().description('鉴权token超时时间').default(Time.minute*10),
    loginTokenExpire:Schema.number().default(Time.week)
})
export function install(ctx:Context){
    const config=Config(useOptions('services.consoleAuth'))
    ctx.console.addEntry(resolve(__dirname,'../client/index.ts'))
    ctx.service('console.user',new AuthService(ctx,config))
    ctx.service('console.config',new ConfigService(ctx))
}