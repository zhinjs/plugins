import {DataService, SocketHandle} from "@zhinjs/plugin-console";
import {Awaitable, Context, Zhin} from "zhin";
declare module '@zhinjs/plugin-console'{
    namespace Console{
        interface Services{
            config:ConfigService
        }
    }
    interface Events {
        'config/update'(this: SocketHandle, options:Zhin.Options): Awaitable<string>
        'config'(this: SocketHandle): void
    }
}
function setData(handler:SocketHandle,options:Zhin.Options){
    if (!handler.user) throw new Error('请先登录。')
    if(handler.user.authority!==7) throw new Error('权限不足')
    handler.ctx?.zhin?.changeOptions(options)
    handler.send({ type: 'data', body: { key: 'config', value:handler.ctx.zhin.options } })
    handler.refresh()
}
export class ConfigService extends DataService<{}>{
    constructor(ctx:Context) {
        super(ctx,'config');
        this.startListen()
    }
    startListen(){
        this.ctx.console.addListener('config/update', async function (options) {
            setData(this,options)
            return '修改成功'
        })
        this.ctx.console.addListener('config',function () {
            this.send({ type: 'data', body: { key: 'config', value:this.ctx.zhin.options } })
        })
    }
}