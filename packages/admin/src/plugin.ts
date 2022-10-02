import {Bot} from "zhin";

export const name= 'pluginManage'
export function install(bot:Bot){
    bot.command('admin/plugin')
        .desc('插件管理')
        .option('list','-l 显示插件列表')
        .option('detail','-d [name:string] 查看指定插件详情')
        .action(({options,event})=>{
            if(options.list){
                return bot.pluginList.map(plugin=>{
                    const {install,dispose,disposes,...packageInfo}=plugin
                    return `name:${plugin.name} ${plugin.desc||''}`
                }).join('\n')
            }
            if(options.detail){
                const {install,dispose,disposes,...detail}=bot.pluginList.find(p=>p.name===options.detail)||{}
                if(!Object.keys(detail).length) return '未找到插件：'+options.detail
                return JSON.stringify(detail,null,2)
                    .replace(/"/g,'')
                    .replace(/\\/g,'')
            }
        })
}