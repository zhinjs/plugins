import {Bot,Plugin} from "zhin";
import {networkInterfaces} from "os";
import {createServer,Server} from "http";
import KoaBodyParser from "koa-bodyparser";
import {Router} from "./router";
declare module 'zhin'{
    namespace Bot{
        interface Services {
            router:Router
            server:Server
        }
    }
}
export function getIpAddress(){
    const interfaces=networkInterfaces()
    const ips:string[]=[]
    for (let dev in interfaces) {
        for (let j = 0; j < interfaces[dev].length; j++) {
            if (interfaces[dev][j].family === 'IPv4') {
                ips.push(interfaces[dev][j].address);
            }
        }
    }
    if(!ips.length)ips.push('127.0.0.1')
    return ips
}
export const name='http'

export function install(this:Plugin,bot:Bot,config:HttpService.Config={}){
    if(!config) config={}
    const server=createServer(bot.koa.callback())
    const router=new Router(server,{prefix:config.path})
    bot.service('server',server)
        .service('router',router)
    bot.koa.use(KoaBodyParser())
        .use(router.routes())
        .use(router.allowedMethods())
    server.listen(config.port||=8086)
    bot.logger.info(`server listen at ${getIpAddress().map(ip=>`http://${ip}:${config.port}`).join(' and ')}`)
    this.disposes.push(()=>{
        server.close()
        return true
    })
}
export namespace HttpService{
    export interface Config{
        selfUrl?:string
        port?:number
        path?:string
    }
}
