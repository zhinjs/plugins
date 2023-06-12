import {Context, h, defineComponent, Element,evaluate} from "zhin";
import path from "path";
import fs from "fs";

export const name = 'request'

export function install(ctx: Context) {
    ctx.component('request', defineComponent({
        props: {
            url: String,
            method: String,
            config: String
        },
        data() {
            return {
                result:undefined
            }
        },
        methods:{
          withDefault(){
              return {
                  url:this.url||'',
                  method:this.method||'get',
                  config:JSON.parse(this.config||'{}')
              } as {
                  url:string
                  method:'get'|'post'|'put'|'delete',
                  config:Record<string, any>
              }
          }
        },
        async render(props, children) {
            const {url,method,config}=this.withDefault()
            this.result = await ctx.request(method,url,config)
            return await this.session.render(children,this)
        }
    }))
    const p = ctx.command('utils/axios')
        .desc('请求工具')
    p.command('axios.get <url:string>')
        .desc('发起get请求')
        .option('-C <config:json> 配置请求config', {})
        .action(async ({session, options}, url) => {
            const res = await ctx.request.get(encodeURI(url), options.config)
            try {
                return JSON.stringify(res, null, 2)
            } catch {
                return typeof res === 'string' ? res : undefined
            }
        })
    p.command('axios.load <url:string>')
        .desc('加载资源')
        .option('-t [type:string] 资源类型，可选值：image,music,video，默认：image', 'image')
        .action(async ({session, options}, url) => {
            try {
                const res = await ctx.request.get(encodeURI(url), {
                    responseType: 'arraybuffer'
                })
                switch (options.type) {
                    case 'music':
                        return h('record', {src: `base64://${Buffer.from(res, 'binary').toString('base64')}`})
                    case 'image':
                        return h('image', {src: `base64://${Buffer.from(res, 'binary').toString('base64')}`})
                    case 'video':
                        const fileUrl = path.join(ctx.zhin.options.data_dir, `${new Date().getTime()}.mp4`)
                        await fs.promises.writeFile(fileUrl, res, 'binary');
                        return h('video', {src: fileUrl})
                    default:
                        return '未知类型：' + options.type
                }
            } catch (e) {
                return e.message
            }
        })
    p.command('axios.post <url:string>')
        .desc('发起post请求')
        .option('-C <config:json> 配置请求config')
        .option('-d <data:json> post数据')
        .action(async ({session, options}, url) => {
            const res = await ctx.request.post(encodeURI(url), options.data, options.config)
            try {
                return JSON.stringify(res, null, 2)
            } catch {
                return typeof res === 'string' ? res : undefined
            }
        })

}
