import {Bot} from "zhin";
import * as Yaml from 'js-yaml'
import * as fs from 'fs'
import {get,unset,set,mapValues} from "lodash";
function protectPassword(obj:Record<string, any>){
    if(!obj || typeof obj!=='object') return obj
    return mapValues(obj,(value,key)=>{
        if(typeof value==='object') return protectPassword(value)
        if(key!=='password') return value
        return new Array(value.length).fill('*').join('')
    })
}
function outputConfig(config,key){
    if(!key)return JSON.stringify(protectPassword(config),null,2)
    const result=JSON.stringify(protectPassword(get(config,key)),null,2)
    return key.endsWith('password')?new Array(result.length).fill('*').join(''):result
}
export const name='config'
export function install(bot:Bot){
    bot.command('admin/config [key:string] [value]')
        .desc('编辑配置文件')
        .auth('master',"admins")
        .option('delete','-d 删除指定配置')
        .action(({options}, key,value) => {
            const config=Yaml.load(fs.readFileSync(process.env.configPath||'','utf8'))
            if(value===undefined && !options.delete) return outputConfig(config,key)
            if(options.delete){
                unset(config,key)
                fs.writeFileSync(process.env.configPath,Yaml.dump(config))
                return `已删除:config.${key}`
            }
            try{
                value=JSON.parse(value)
            }catch {}
            set(config,key,value)
            fs.writeFileSync(process.env.configPath,Yaml.dump(config))
            return `修改成功`
        })
}