import {Bot, Dict} from "zhin";
import {Sendable} from 'oicq'

export class Prompt{
    private fullChannelId:string
    constructor(private bot:Bot,private event:Bot.MessageEvent,public timeout:number) {
        this.fullChannelId=Bot.getFullChannelId(event)
    }
    async prompts<O extends Prompt.Options>(options:O):Promise<Prompt.ResultS<O>>{
        let result:Prompt.ResultS<O>={} as Prompt.ResultS<O>
        const names=Object.keys(options)
        for(const name of names){
            result[name as keyof O]=await this[options[name].type as any](options[name].message,options[name])
        }
        return result
    }
    async $prompt<T extends keyof Prompt.Types,CT extends keyof Prompt.BaseTypes,M extends boolean=false>(options:Prompt.Option<T,CT,M>){
        await this.event.reply(options.message)
        return new Promise<Prompt.Result<T, CT, M>>((resolve)=>{
            const dispose=this.bot.middleware(async (event,next)=>{
                if(this.fullChannelId!==Bot.getFullChannelId(event)) return next()
                resolve(options.format(event))
                dispose()
                clearTimeout(timer)
            },true)
            const timer=setTimeout(()=>{
                dispose()
                resolve(options.initial)
            },this.timeout)
        }).catch(e=>{
            this.event.reply(e.message)
        })
    }
    text(message:Sendable='请输入文本',initial=''){
        return this.$prompt({
            type:'text',
            message,
            initial,
            format:Prompt.transforms['text']
        })
    }
    number(message:Sendable='请输入数值',initial=0){
        return this.$prompt({
            type:'number',
            message,
            initial,
            format:Prompt.transforms['number'],
        })
    }
    date(message:Sendable='请输入日期',initial=new Date()){
        return this.$prompt({
            type:'date',
            message,
            initial,
            format:Prompt.transforms['date'],
        })
    }
    regexp(message:Sendable='请输入正则',initial=/.+/){
        return this.$prompt({
            type:'regexp',
            message,
            initial,
            format:Prompt.transforms['regexp'],
        })
    }
    confirm(message:Sendable='确认么？',initial:boolean=false){
        return this.$prompt({
            type:'confirm',
            message:`${message}\n输入${['yes','y','Yes','YES','Y','.','。','确认'].join()}为确认`,
            initial,
            format:Prompt.transforms['confirm']
        })
    }
    qq(message:Sendable='请输入qq'){
        return this.$prompt({
            type:'qq',
            message,
            format:Prompt.transforms['qq'],
        })
    }
    list<T extends keyof Prompt.BaseTypes>(message:Sendable='请输入',config:Prompt.Option<'list',T>){
        return this.$prompt({
            type:'list',
            message:`${message}\n值之间使用'${config.separator||','}'分隔`,
            initial:config.initial||[],
            child_type:config.child_type,
            format(event){
                return Prompt.transforms['list'][config.child_type](event,config.separator||',')
            }
        })
    }
    toJSON(){
        return {
            fullChannelId:this.fullChannelId,
            timeout:this.timeout
        }
    }
    select<T extends keyof Prompt.BaseTypes,M extends boolean>(message:Sendable='请选择',config:Prompt.Option<'select',T,M>){
        const options:Prompt.Option<'select',T,M>={
            type:'select',
            message:`${message}\n${config.options.map((option,index)=>{
                return `${index+1}:${option.label}`
            }).join('\n')}${config.multiple?`\n选项之间使用'${config.separator||','}'分隔`:''}`,
            format:(event)=>{
                const chooseIdxArr=event.toCqcode().split(config.separator||',').map(Number)
                return Prompt.transforms['select'][config.child_type][config.multiple?'true':'false'](event,config.options,chooseIdxArr) as Prompt.Select<T,M>
            },
            ...config
        }
        return this.$prompt(options)
    }
}
export namespace Prompt{
    export interface BaseTypes{
        text:string
        number:number
        qq:number
        confirm:boolean
        regexp:RegExp
        date:Date
    }
    export interface QuoteTypes<T extends keyof BaseTypes=keyof BaseTypes,M extends boolean=false>{
        list:List<T>
        select:Select<T,M>
    }
    export interface Types<CT extends keyof BaseTypes=keyof BaseTypes,M extends boolean=false> extends BaseTypes,QuoteTypes<CT,M>{
    }
    export type Result<T extends keyof Types,CT extends keyof BaseTypes,M extends boolean>=T extends 'select'?Select<CT,M>:T extends 'list'?Array<BaseTypes[CT]>:Types[T]
    export type List<T extends keyof BaseTypes=keyof BaseTypes>=Array<BaseTypes[T]>
    export type Select<T extends keyof BaseTypes=keyof BaseTypes,M extends boolean=false>=M extends true?Array<BaseTypes[T]>:BaseTypes[T]
    export type Option<T extends keyof Types=keyof Types,CT extends keyof BaseTypes=keyof BaseTypes,M extends boolean=false> = {
        message?:Sendable
        type?:T
        child_type?:CT
        multiple?:T extends 'select'?M:boolean
        initial?:Result<T, CT, M>
        timeout?:number
        format?:(event:Bot.MessageEvent)=>Result<T, CT, M>
        validate?:(value:Types[T],...args:any[])=>boolean
        separator?:string
        options?:T extends 'select'?Prompt.SelectOption<CT>[]:never
    }
    export interface Options{
        [key:string]:Option
    }
    export type ResultS<S extends Dict>={
        [T in keyof S]:ResultItem<S[T]>
    }
    export type ResultItem<O>= O extends Option<infer T,infer CT,infer M>?Result<T, CT, M>:unknown
    export interface SelectOption<T extends keyof BaseTypes>{
        label:Sendable
        value:BaseTypes[T]
    }
    export  type Transforms<CT extends keyof BaseTypes= keyof BaseTypes,M extends boolean=false>={
        [P in keyof Types]?:Transform<P>
    }
    export type Transform<T extends keyof Types>= T extends keyof QuoteTypes?QuoteTransform<T>:(event:Bot.MessageEvent)=>Types[T]
    export type QuoteTransform<T extends keyof Types>=T extends 'select'?SelectTransform:
        T extends 'list'?ListTransform:
            unknown
    export type SelectTransform={
        [P in keyof BaseTypes]?:{
            true?:(event:Bot.MessageEvent,options:Array<SelectOption<P>>,chooseArr:number[])=>Array<BaseTypes[P]>
            false?:(event:Bot.MessageEvent,options:Array<SelectOption<P>>,chooseArr:number[])=>BaseTypes[P]
        }
    }
    export type ListTransform={
        [P in keyof BaseTypes]?:(event:Bot.MessageEvent,separator:string)=>Array<BaseTypes[P]>
    }
    export const transforms:Transforms={}
    export function defineTransform<T extends keyof Types,CT extends keyof BaseTypes=keyof BaseTypes,M extends boolean=false>(type:T,transform:Transforms[T]){
        transforms[type]=transform
    }
    defineTransform("number",(event)=>{
        if(!/^[0-9]*$/.test(event.toCqcode())) throw new Error('type Error')
        return +event.toCqcode()
    })
    defineTransform('qq',(event)=>{
        const atReg=/^\[type=at,qq=(\d+).+]/
        if(atReg.test(event.toCqcode())) return +event.toCqcode().replace(atReg,(str)=>str)
        return transforms["number"](event)
    })
    defineTransform('text',(event)=>{
        return event.toCqcode()
    })
    defineTransform('confirm',(event)=>{
        return ['yes','y','Yes','YES','Y','.','。','确认'].includes(event.toCqcode())
    })
    defineTransform("regexp", (event)=>{
        return new RegExp(event.toCqcode())
    })
    defineTransform('date',(event)=>{
        if(/^[0-9]$/g.test(event.toCqcode())) return new Date(+event.toCqcode())
        return new Date(event.toCqcode())
    })
    defineTransform('list',{
        date(event,separator){
            return event.toCqcode().split(separator).map(str=>{
                if(/^[0-9]$/g.test(str)) return new Date(+str)
                return new Date(str)
            })
        },
        number(event,separator){
            return event.toCqcode().split(separator).map(str=>{
                if(!/^[0-9]$/g.test(str))throw new Error('type Error')
                return +str
            })
        },
        text(event,separator){
            return event.toCqcode().split(separator)
        },
        regexp(event,separator){
            return event.toCqcode().split(separator).map(str=>{
                return new RegExp(str)
            })
        }
    })
    defineTransform('select',{
        date:{
            true(event,options,choose){
                return options.filter((_,index)=>choose.includes(index+1))
                    .map(option=>option.value)
            },
            false(event,options,choose){
                return options[choose?.[0]-1]?.value
            }
        },
        number:{
            true(event,options,choose){
                return options.filter((_,index)=>choose.includes(index+1))
                    .map(option=>option.value)
            },
            false(event,options,choose){
                return options[choose?.[0]-1]?.value
            }
        },
        text:{
            true(event,options,choose){
                return options.filter((_,index)=>choose.includes(index+1))
                    .map(option=>option.value)
            },
            false(event,options,choose){
                return options[choose?.[0]-1]?.value
            }
        },
        regexp:{
            true(event,options,choose){
                return options.filter((_,index)=>choose.includes(index+1))
                    .map(option=>option.value)
            },
            false(event,options,choose){
                return options[choose?.[0]-1]?.value
            }
        }
    })
}