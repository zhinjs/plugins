import {Plugin, Dict, pick, Time, Bot} from "zhin";
import {DataService} from "@zhinjs/plugin-console";
import * as Yaml from 'js-yaml'
import fs from "fs";
declare module 'zhin'{
    interface Bot{
        _messageSent?: TickCounter
        _messageReceived?: TickCounter
    }
}
declare module '@zhinjs/plugin-console'{
    namespace Console{
        interface Services{
            bot:BotService
        }
    }
    interface Events{
        'control/bot-update'(config: Bot.Options): void
        'control/bot-login'(uin:string,type:'password'|'slider'|'sms',value?:string):void
    }
}
class TickCounter{
    public stop: () => void

    private data = new Array(60).fill(0)

    private tick = () => {
        this.data.unshift(0)
        this.data.splice(-1, 1)
    }

    constructor(plugin: Plugin) {
        const timer=setInterval(()=>this.tick(),Time.second)
        const dispose=()=>{
            clearInterval(timer)
            return true
        }
        plugin.disposes.push(this.stop=dispose)
    }

    public add(value = 1) {
        this.data[0] += value
    }

    public get() {
        return this.data.reduce((prev, curr) => prev + curr, 0)
    }
}
export class BotService extends DataService<Dict<BotService.Data>> {
    callbacks: BotService.Extension[] = []

    constructor(public plugin: Plugin,bot:Bot) {
        super(bot, 'bot', { authority: 4 })

        bot.before('send', (session) => {
            bot._messageSent.add(1)
        })

        bot.on('message', () => {
            bot._messageReceived.add(1)
        })
        BotService.initialize(bot, plugin)


        bot.console.addListener('control/bot-login',(uin,type,value)=>{
            return this.loginBot(uin,type,value?value:undefined)
        },{authority:4})
        bot.console.addListener('control/bot-update', (config) => {
            this.updateBot(config)
        }, { authority: 4 })

        bot.on('system.online', () => {
            this.refresh()
        })
        bot.on('system.offline', () => {
            this.refresh()
        })

        this.extend((bot) => {
            return {
                ...pick(bot['client'], ['uin', 'nickname', 'status']),
                config: bot.config,
                messageSent: bot._messageSent.get(),
                messageReceived: bot._messageReceived.get(),
            }
        })
    }

    loginBot(uin:string,type:'password'|'slider'|'sms',value?:string){
        return new Promise((resolve, reject) => {
            const disposeArr=[
                this.bot.on('bot.system.online',()=>{
                    disposeArr.forEach(dispose=>dispose())
                    resolve({success:true,message:'登录成功',data:''})
                }),
                this.bot.on('bot.system.login.device',()=>{
                    disposeArr.forEach(dispose=>dispose())
                    this.bot.sendSmsCode()
                    resolve({
                        data:'',
                        reason:'device',
                        success:false,
                        message:'收到设备验证，请输入该账号绑定手机收到的验证码'
                    })
                }),
                this.bot.on('bot.system.login.qrcode',(session)=>{
                    disposeArr.forEach(dispose=>dispose())
                    resolve({
                        data:`data:image/png;base64,${session.image.toString('base64')}`,
                        reason:'qrcode',
                        success:false,
                        message:'收到登录二维码，请扫码后继续'
                    })
                }),
                this.bot.on('bot.system.login.slider',(session)=>{
                    disposeArr.forEach(dispose=>dispose())
                    resolve({
                        data:`请通过下面的url获取ticket后继续\n${session.url}`,
                        reason:'slider',
                        success:false,
                        message:'滑块验证'
                    })
                }),
                this.bot.on('bot.system.login.error',(session)=>{
                    disposeArr.forEach(dispose=>dispose())
                    resolve({
                        data:session.code,
                        reason:session.message,
                        success:false,
                        message:'登录失败'
                    })
                }),
            ];
            switch (type){
                case "password":
                    this.bot.login(value)
                    break;
                case "slider":
                    this.bot.submitSlider(value)
                    break;
                case 'sms':
                    this.bot.submitSmsCode(value)
                    break;
                default:
                    reject(new Error('无效的类型'))
            }
        })
    }
    updateBot(config: Bot.Options) {
        fs.writeFileSync(Yaml.dump(config),'utf8')
    }
    extend(callback: BotService.Extension) {
        this.callbacks.push(callback)
    }

    async get() {
        return Object.assign({
            uin:this.bot.uin
        },...this.callbacks.map(cb => cb(this.bot)))
    }
}
export namespace BotService{
    export function initialize(bot: Bot, plugin: Plugin) {
        bot._messageSent = new TickCounter(plugin)
        bot._messageReceived = new TickCounter(plugin)
    }

    export type Extension = (bot: Bot) => Partial<Data>

    export interface Data extends Pick<Bot, 'uin' | 'nickname' | 'status'> {
        config:Partial<Bot.Options>,
        messageSent: number
        messageReceived: number
    }
}
