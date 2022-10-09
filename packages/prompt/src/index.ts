import {Bot} from "zhin";
import {Prompt} from "./prompt";
declare module 'icqq'{
    interface MessageEvent{
        prompt:Prompt
    }
}
export function install(bot:Bot,timeout:number=60000){
    bot.before('message',(event)=>{
        event.prompt=new Prompt(bot,event,timeout)
    })
    const command=bot.command('prompt')
        .desc('提示输入工具')
    command.subcommand('prompt.text [message:text]')
        .desc('提示用户输入一串文本')
        .option('initial','-i <initial:text> 默认值')
        .action(async ({event,options},message)=>{
            return await event.prompt.text(message, options.initial)
        })
    command.subcommand('prompt.number [message:text]')
        .desc('提示用户输入一个数值')
        .option('initial','-i <initial:number> 默认值')
        .action(async ({event,options},message)=>{
            return ''+(await event.prompt.number(message, options.initial))
        })
    command.subcommand('prompt.confirm [message:text]')
        .desc('提示用户确认操作')
        .option('initial','-i <initial:boolean> 默认值')
        .action(async ({event,options},message)=>{
            return ''+(await event.prompt.confirm(message, options.initial))
        })
    command.subcommand('prompt.date [message:text]')
        .desc('提示用户输入一个日期')
        .option('initial','-i <initial:date> 默认值')
        .action(async ({event,options},message)=>{
            return ''+(await event.prompt.date(message, options.initial))
        })
    command.subcommand('prompt.regexp [message:text]')
        .desc('提示用户输入一个正则表达式')
        .option('initial','-i <initial:regexp> 默认值')
        .action(async ({event,options},message)=>{
            return ''+(await event.prompt.regexp(message, options.initial))
        })
    command.subcommand('prompt.list <child_type:string> [message:text]')
        .desc('提示用户输入一个指定类型的列表')
        .option('initial','-i <initial:array> 默认值')
        .action(async ({event,options},child_type,message)=>{
            const allowTypes:(keyof Prompt.BaseTypes)[]=['text','number','confirm','date','regexp','qq']
            if(!allowTypes.includes(child_type as keyof Prompt.BaseTypes)) throw new Error('子类型错误')
            return ''+(await event.prompt.list(message, {child_type:child_type as keyof Prompt.BaseTypes,initial:options.initial}))
        })
    command.subcommand('prompt.select <child_type:string> [message:text]')
        .desc('提示用户输入一个指定类型的列表')
        .option('multiple','-m 是否多选')
        .option('options','-o <options:array> 可选项列表({label,value}数组)}')
        .option('initial','-i <initial> 默认值')
        .action(async ({event,options},child_type,message)=>{
            const allowTypes:(keyof Prompt.BaseTypes)[]=['text','number','confirm','date','regexp','qq']
            if(!allowTypes.includes(child_type as keyof Prompt.BaseTypes)) throw new Error('子类型错误')
            return ''+(await event.prompt.select(message, {child_type:child_type as keyof Prompt.BaseTypes,initial:options.initial,multiple:options.multiple,options:options.options}))
        })

}