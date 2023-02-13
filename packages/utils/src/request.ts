import {Context, Dict, h, Schema, useOptions} from "zhin";
import {segment} from "oicq";
import path from "path";
import fs from "fs";
import axios, { AxiosRequestConfig, AxiosResponse, Method } from 'axios'

export interface Request {
    <T = any>(method: Method, url: string, config?: AxiosRequestConfig): Promise<T>
    axios<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>
    extend(config: Request.Config): Request
    config: Request.Config
    head(url: string, config?: AxiosRequestConfig): Promise<Dict<string>>
    get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T>
    delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T>
    post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>
    put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>
    patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>
}
export namespace Request {
    export interface Config {
        headers?: Dict
        endpoint?: string
        timeout?: number
    }

    export function create(config: Request.Config = {}) {
        const {endpoint = ''} = config

        const options: AxiosRequestConfig = {
            timeout: config.timeout,
            headers: config.headers,
        }

        const request = async (url: string, config: AxiosRequestConfig = {}) => axios({
            ...options,
            ...config,
            url: endpoint + url,
            headers: {
                ...options.headers,
                ...config.headers,
            },
        })

        const http = (async (method, url, config) => {
            const response = await request(url, {...config, method})
            return response.data
        }) as Request

        http.config = config
        http.axios = request as any
        http.extend = (newConfig) => create({...config, ...newConfig})

        http.get = (url, config) => http('GET', url, config)
        http.delete = (url, config) => http('DELETE', url, config)
        http.post = (url, data, config) => http('POST', url, {...config, data})
        http.put = (url, data, config) => http('PUT', url, {...config, data})
        http.patch = (url, data, config) => http('PATCH', url, {...config, data})
        http.head = async (url, config) => {
            const response = await request(url, {...config, method: 'HEAD'})
            return response.headers
        }

        return http
    }
}
export const Config=Schema.object({
    headers:Schema.dict(Schema.any()).description('请求头'),
    endpoint:Schema.string().description('请求baseUrl'),
    timeout:Schema.number().description('请求超时时间')
})
export const name='request'
export function install(ctx:Context,config){
    if(!config) return
    ctx.service('axios',Request.create(config))
    const p=ctx.command('utils/axios')
        .desc('请求工具')
    p.subcommand('axios.get <url:string>')
        .desc('发起get请求')
        .option('callback','-c <callback:function> 回调函数')
        .option('config','-C <config:object> 配置请求config')
        .action(async ({session,options},url)=>{
            const res=await ctx.axios.get(encodeURI(url),options.config)
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
                const res=await ctx.axios.get(encodeURI(url),{
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
            const res=await ctx.axios.post(encodeURI(url),options.data,options.config)
            const target=session['group']||session['friend']
            if(options.callback) return options.callback.apply({result:res,shareMusic:target.shareMusic.bind(target),segment})
            try{
                return JSON.stringify(res,null,2)
            }catch {
                return typeof res==='string'?res:undefined
            }
        })

}
