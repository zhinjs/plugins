import {Bot, Dict} from "zhin";
import {Sendable} from 'icqq'

export class Prompt{
    private fullChannelId:string
    constructor(private bot:Bot,private event:Bot.MessageEvent,public timeout:number) {
        this.fullChannelId=Bot.getFullChannelId(event)
    }
    async $prompt<T extends keyof Prompt.Types,CT extends keyof Prompt.BaseTypes,M extends boolean=false>(options:Prompt.Options<T,CT,M>){
        await this.event.reply(options.message)
        return new Promise<T extends 'select'?Prompt.Select<CT,M>:T extends 'list'?Array<Prompt.BaseTypes[CT]>:Prompt.Types[T]>((resolve)=>{
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
    confirm(message:Sendable='确认么？',initial:boolean=false){
        return this.$prompt({
            type:'confirm',
            message:`${message}\n输入${['yes','y','Yes','YES','Y','.','。','确认'].join()}为确认`,
            initial,
            format:Prompt.transforms['confirm']
        })
    }
    list<T extends keyof Prompt.BaseTypes>(message:Sendable='请输入',config:Prompt.ListConfig<T>){
        return this.$prompt({
            type:'list',
            message:`${message}\n值之间使用'${config.separator||','}'分隔`,
            initial:config.initial||[],
            child_type:config.type,
            format(event){
                return Prompt.transforms['list'][config.type](event,config.separator||',')
            }
        })
    }
    select<T extends keyof Prompt.BaseTypes,M extends boolean>(message:Sendable='请选择',config:Prompt.SelectConfig<T,M>){
        return this.$prompt({
            type:'select',
            message:`${message}\n${config.options.map((option,index)=>{
                return `${index+1}:${option.label}`
            }).join('\n')}${config.multiple?`\n选项之间使用'${config.separator||','}'分隔`:''}`,
            multiple:config.multiple,
            child_type:config.type,
            initial:(config.multiple?[]:Prompt.defaultValue[config.type]) as Prompt.Select<T,M>,
            format:(event)=>{
                const chooseIdxArr=event.cqCode.split(config.separator||',').map(Number)
                return Prompt.transforms['select'][config.type][config.multiple?'true':'false'](event,config.options,chooseIdxArr) as any
            }
        })
    }
}
export namespace Prompt{
    export interface BaseTypes{
        text:string
        number:number
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
    export type List<T extends keyof BaseTypes=keyof BaseTypes>=Array<BaseTypes[T]>
    export type Select<T extends keyof BaseTypes=keyof BaseTypes,M extends boolean=false>=M extends true?Array<BaseTypes[T]>:BaseTypes[T]
    export interface Options<T extends keyof Types=keyof Types,CT extends keyof BaseTypes=keyof BaseTypes,M extends boolean=false>{
        message:Sendable
        type:T
        child_type?:CT
        multiple?:M
        initial?:T extends 'select'?Select<CT,M>:T extends 'list'?Array<BaseTypes[CT]>:Types[T]
        timeout?:number
        format?:(event:Bot.MessageEvent)=>T extends 'select'?Select<CT,M>:T extends 'list'?Array<BaseTypes[CT]>:Prompt.Types[T]
        validate?:(value:Types[T],...args:any[])=>boolean
        [key:string]:any
    }
    export type NamedOptions<N extends string|symbol=string,T extends keyof Types=keyof Types,CT extends keyof BaseTypes=keyof BaseTypes,M extends boolean=false>={
        name:N
    } & Options<T,CT,M>
    export const defaultValue:{[P in keyof BaseTypes]?:BaseTypes[P]}={
        number:0,
        confirm:false,
        text:'',
        date:new Date(),
        regexp:new RegExp('')
    }
    export interface ListConfig<T extends keyof BaseTypes= keyof BaseTypes>{
        type:T
        initial?:Array<BaseTypes[T]>
        separator?:string
    }
    export interface SelectConfig<T extends keyof BaseTypes= keyof BaseTypes,M extends boolean=boolean>{
        type:T
        initial?:M extends true?T[]:T
        options:Array<SelectOption<T>>
        multiple:M
        separator?:string
    }
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
        if(!/^[0-9]*$/.test(event.cqCode)) throw new Error('type Error')
        return +event.cqCode
    })
    defineTransform('text',(event)=>{
        return event.cqCode
    })
    defineTransform('confirm',(event)=>{
        return ['yes','y','Yes','YES','Y','.','。','确认'].includes(event.cqCode)
    })
    defineTransform("regexp", (event)=>{
        return new RegExp(event.cqCode)
    })
    defineTransform('date',(event)=>{
        if(/^[0-9]$/g.test(event.cqCode)) return new Date(+event.cqCode)
        return new Date(event.cqCode)
    })
    defineTransform('list',{
        date(event,separator){
            return event.cqCode.split(separator).map(str=>{
                if(/^[0-9]$/g.test(str)) return new Date(+str)
                return new Date(str)
            })
        },
        number(event,separator){
            return event.cqCode.split(separator).map(str=>{
                if(!/^[0-9]$/g.test(str))throw new Error('type Error')
                return +str
            })
        },
        text(event,separator){
            return event.cqCode.split(separator)
        },
        regexp(event,separator){
            return event.cqCode.split(separator).map(str=>{
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