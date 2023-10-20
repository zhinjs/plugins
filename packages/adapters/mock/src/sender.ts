import {Bot, Random, remove,Element} from "zhin";
import {MockBot} from "./bot";

export class Sender{
    history:Bot.MessageRet[]=[]
    constructor(public bot:MockBot) {
    }
    getMsg(message_id:string):Promise<Bot.MessageRet>{
        return Promise.resolve(this.history.find(m=>m.message_id===message_id))
    }
    async deleteMsg(message_id:string){
        return remove(this.history,await this.getMsg(message_id))
    }
    _sendMsg(message:Bot.Message):Promise<Bot.MessageRet>{
        const message_id=Random.id(16)
        const result={
            message_id,
            ...message
        }
        const session=this.bot.createSession('message',{
            detail_type:message.type,
            message_id:Random.id(16),
            [`${message.type==="private"?'user':message.type}_id`]:message.to_id,
            user_id:this.bot.self_id,
            user_name:'Zhin',
            content:Sender.toHTML(Element.parse(Element.unescape(message.content))),
        })
        this.history.push(result)
        this.bot.adapter.emit('mock/message_send',session)
        this.bot.adapter.emit('message.send',this.bot.self_id,session)
        return Promise.resolve(result)
    }
}
export namespace Sender{
    export function toHTML(content:Element[]):string{
        let result=''
        for(const element of content){
            switch (element.type){
                case 'text':
                    result+=Element.escape(element.attrs.text)
                    break
                case 'image':
                    result+=`<img src="data:image/png;base64,${element.attrs.src.replace('base64://','')}" alt="${element.attrs.text}">`
                    break;
                case 'mention':
                    result+=`@${element.attrs.user_name}`
                    break;
                case 'video':
                    result+=`<video src="${element.attrs.src}" controls></video>`
                    break;
                case 'audio':
                    result+=`<audio src="${element.attrs.src}" controls></audio>`
                case 'face':
                    result+=`<img src="https://maohaoji.com/zhindocimage/2${element.attrs.id}.png" alt="${element.attrs.text}">`;
                    break;
                default:
                    result+=Element.escape(element.toString())
            }
        }
        return result
    }
}
