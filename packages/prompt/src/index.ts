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
    bot.command('test')
        .action(async ({event})=>{
            // const confirm=await event.prompt.confirm('确认么？')
            // await event.reply('你输入的是'+(typeof confirm)+':'+confirm)
            // const text=await event.prompt.text('请输入文本')
            // await event.reply('你输入的是'+(typeof text)+':'+text)
            // const number=await event.prompt.number('请输入数字')
            // await event.reply('你输入的是'+(typeof number)+':'+number)
            // const list=await event.prompt.list('请输入',{type:'text'})
            // await event.reply('你输入的是'+(typeof list)+':'+list)
            const obj=await event.prompt.prompts({
                name:{
                    type:'text',
                    message:'输入年龄',
                },
                age:{
                    type:"text",
                    message:'请输入性别'
                }
            })
            const select=await event.prompt.select('请选择',{
                child_type:'date',
                multiple:true,
                options:[
                    {label:'第一项',value:new Date()},
                    {label:'第二项',value:new Date()}
                ]})
            await event.reply('你输入的是'+(typeof select)+':'+select)
        })
}