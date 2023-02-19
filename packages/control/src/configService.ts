import {DataService, SocketHandle} from "@zhinjs/plugin-console";
import {Awaitable, Context, Zhin} from "zhin";
import lodash from 'lodash'
declare module '@zhinjs/plugin-console'{
    namespace Console{
        interface Services{
            config:ConfigService
        }
    }
    interface Events {
        'config/update'<K extends Zhin.Keys<Zhin.Options>>(this: SocketHandle, path:K,value:Zhin.Value<Zhin.Options,K>): Awaitable<string>
        'config/add'(this: SocketHandle, path:string,value:any): Awaitable<string>
        'config/delete'(this: SocketHandle, path:string): string
        'config'(this: SocketHandle): void
    }
}
function setData(handler:SocketHandle,path:string,value:any){
    if (!handler.user) throw new Error('请先登录。')
    if(handler.user.authority!==7) throw new Error('权限不足')
    lodash.set(this.ctx.app.options,path,value)
    handler.send({ type: 'data', body: { key: 'config', value:this.ctx.app.options } })
    handler.refresh()
}
export class ConfigService extends DataService<{}>{
    constructor(ctx:Context) {
        super(ctx,'config');
        this.startListen()
    }
    startListen(){
        this.ctx.console.addListener('config/add', async function (path,value) {
            setData(this,path,value)
            return '新增成功'
        })
        this.ctx.console.addListener('config/update', async function (path,value) {
            setData(this,path,value)
            return '修改成功'
        })
        this.ctx.console.addListener('config',function () {
            this.send({ type: 'data', body: { key: 'config', value:this.ctx.app.options } })
        })
        this.ctx.console.addListener('config/delete', function (path) {
            if (!this.user) throw new Error('请先登录。')
            if(this.user.authority!==7) throw new Error('权限不足')
            lodash.unset(this.ctx.app.options,path)
            this.send({ type: 'data', body: { key: 'config', value:this.ctx.app.options } })
            this.refresh()
            return '删除成功'
        })
    }
}