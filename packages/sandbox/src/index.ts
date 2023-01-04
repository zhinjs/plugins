import {Bot,Plugin} from "zhin";
import * as fs from 'fs'
import * as path from 'path'
import {ChildProcess,fork} from 'child_process'
let worker:ChildProcess
let flag = false
function startWorker(bot,master) {
    if (!flag)
        return
    worker = fork(path.join(__dirname, "worker"),{
        env:{
            master
        },
    })
    worker.on("error", (err) => {
        fs.appendFile("err.log", Date() + " " + err.stack + "\n", ()=>{})
    })
    worker.on("exit", () => {
        startWorker(bot,master)
    })
    worker.on("message", async (v) => {
        const value=v as any
        let ret = await bot[value?.method]?.apply(bot, value?.params)
        if (ret instanceof Map)
            ret = Array.from(ret)
        if(!ret) ret={}
        ret.echo = value?.echo
        worker.send({
            data: ret,
            echo: value?.echo
        })
    })
}

export const name='sandbox';
export function install(this:Plugin,bot:Bot,master=1659488338){
    if(!master) master=1659488338
    let dispose:Bot.Dispose<any>
    bot.command('sandbox')
        .desc('沙盒环境')
        .alias('沙箱')
        .auth("admins")
        .option('start','-s 启动沙箱')
        .option('restart','-r 重启沙箱')
        .option('stop','-e 停止沙箱')
        .shortcut(/^启动(沙箱|sandbox)$/,{options:{start:true}})
        .shortcut(/^重启(沙箱|sandbox)$/,{options:{restart:true}})
        .shortcut(/^停止(沙箱|sandbox)$/,{options:{stop:true}})
        .action(({event,options})=>{
            if(options.start && options.restart){
                return 'start 和 restart 不能同时使用'
            }
            if(options.start && options.stop){
                return 'start 和 stop 不能同时使用'
            }
            if(options.restart && options.stop){
                return 'restart 和 stop 不能同时使用'
            }
            if(options.start && flag && worker){
                return '沙箱已启动，无需重复启动'
            }
            if(options.stop && !flag){
                return '沙箱已停止运行，无需重复停止运行'
            }
            if(options.start){
                flag=true
                startWorker(bot,master)
                dispose=bot.middleware(async (event,next)=>{
                    await next()
                    const data=event
                    data.cqCode=event.toCqcode()
                    worker!.send(data)
                })
                return '沙箱已启动'
            }
            if(options.stop){
                dispose && dispose()
                flag=false;
                worker?.kill()
                return '沙箱已停止运行'
            }
            if(options.restart){
                worker?.kill()
                return '沙箱正在重启'
            }
        })
    this.disposes.push(()=>{
        flag = false
        worker?.kill()
        return true
    })
}
