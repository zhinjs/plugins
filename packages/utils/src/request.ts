import {Context, h} from "zhin";
import {segment} from "icqq";
import path from "path";
import fs from "fs";
export const name='request'
export function install(ctx:Context){
    const p=ctx.command('utils/axios')
        .desc('请求工具')
    p.subcommand('axios.get <url:string>')
        .desc('发起get请求')
        .option('callback','-c <callback:function> 回调函数')
        .option('config','-C <config:object> 配置请求config')
        .action(async ({session,options},url)=>{
            const res=await ctx.request.get(encodeURI(url),options.config)
            const target=session['group']||session['friend']
            if(options.callback) return options.callback.apply({result:res,shareMusic:target.shareMusic.bind(target),segment})
            try{
                return JSON.stringify(res,null,2)
            }catch {
                return typeof res==='string'?res:undefined
            }
        })
    p.subcommand('axios.load <url:string>')
        .desc('加载资源')
        .option('callback','-c <callback:function> 回调函数')
        .option('type','-t [type] 资源类型，可选值：image,music,video，默认：image',{initial:'image'})
        .action(async ({session,options},url)=>{
            try{
                const res=await ctx.request.get(encodeURI(url),{
                    responseType: 'arraybuffer'
                })
                const target=session['group']||session['friend']
                if(options.callback) return options.callback.apply({result:res,shareMusic:target.shareMusic.bind(target),segment})
                switch (options.type){
                    case 'music':
                        return h('record',{src:`base64://${Buffer.from(res,'binary').toString('base64')}`})
                    case 'image':
                        return h('image',{src:`base64://${Buffer.from(res,'binary').toString('base64')}`})
                    case 'video':
                        const fileUrl=path.join(ctx.app.options.data_dir,`${new Date().getTime()}.mp4`)
                        await fs.promises.writeFile(fileUrl, res, 'binary');
                        return h('video',{src:fileUrl})
                    default:
                        return '未知类型：'+options.type
                }
            }catch (e){
                return e.message
            }
        })
    p.subcommand('axios.post <url:string>')
        .desc('发起post请求')
        .option('callback','-c <callback:function> 回调函数')
        .option('config','-C <config:object> 配置请求config')
        .option('data','-d <data:object> post数据')
        .action(async ({session,options},url)=>{
            const res=await ctx.request.post(encodeURI(url),options.data,options.config)
            const target=session['group']||session['friend']
            if(options.callback) return options.callback.apply({result:res,shareMusic:target.shareMusic.bind(target),segment})
            try{
                return JSON.stringify(res,null,2)
            }catch {
                return typeof res==='string'?res:undefined
            }
        })

}
