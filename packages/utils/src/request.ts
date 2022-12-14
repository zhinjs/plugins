import {toCqcode} from "oicq2-cq-enable";
import {Bot,Dict} from "zhin";
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
export const name='request'
export function install(bot:Bot,config:Request.Config){
    bot.service('axios',Request.create(config))
    const p=bot.command('utils/axios')
        .desc('????????????')
    p.subcommand('axios.get <url>')
        .desc('??????get??????')
        .option('callback','-c <callback:function> ????????????')
        .option('config','-C <config:object> ????????????config')
        .action(async ({event,options},url)=>{
            const res=await bot.axios.get(encodeURI(url),options.config)
            const target=event['group']||event['friend']
            if(options.callback) return options.callback.apply({result:res,shareMusic:target.shareMusic.bind(target),segment})
            try{
                return JSON.stringify(res,null,2)
            }catch {
                return typeof res==='string'?res:undefined
            }
        })
    p.subcommand('axios.load <url>')
        .desc('????????????')
        .option('callback','-c <callback:function> ????????????')
        .option('type','-t [type] ???????????????????????????image,music,video????????????image',{initial:'image'})
        .action(async ({event,options},url)=>{
            try{
                const res=await bot.axios.get(encodeURI(url),{
                    responseType: 'arraybuffer'
                })
                const target=event['group']||event['friend']
                if(options.callback) return options.callback.apply({result:res,shareMusic:target.shareMusic.bind(target),segment})
                switch (options.type){
                    case 'music':
                        return toCqcode({message:[segment.record(`base64://${Buffer.from(res,'binary').toString('base64')}`)]})
                    case 'image':
                        return toCqcode({message:[segment.image(`base64://${Buffer.from(res,'binary').toString('base64')}`)]})
                    case 'video':
                        const fileUrl=path.join(bot.config.data_dir,`${new Date().getTime()}.mp4`)
                        await fs.promises.writeFile(fileUrl, res, 'binary');
                        return toCqcode({message:[segment.video(fileUrl)]})
                    default:
                        return '???????????????'+options.type
                }
            }catch (e){
                return e.message
            }
        })
    p.subcommand('axios.post <url>')
        .desc('??????post??????')
        .option('callback','-c <callback:function> ????????????')
        .option('config','-C <config:object> ????????????config')
        .option('data','-d <data:object> post??????')
        .action(async ({event,options},url)=>{
            const res=await bot.axios.post(encodeURI(url),options.data,options.config)
            const target=event['group']||event['friend']
            if(options.callback) return options.callback.apply({result:res,shareMusic:target.shareMusic.bind(target),segment})
            try{
                return JSON.stringify(res,null,2)
            }catch {
                return typeof res==='string'?res:undefined
            }
        })

}
