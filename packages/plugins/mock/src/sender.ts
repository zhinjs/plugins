import {Bot, Random, remove} from "zhin";
import {MockBot} from "./bot";

export class Sender{
    history:Bot.MessageRet[]
    constructor(public bot:MockBot) {
    }
    getMsg(message_id:string):Promise<Bot.MessageRet>{
        return Promise.resolve(this.history.find(m=>m.message_id===message_id))
    }
    async deleteMsg(message_id:string){
        return remove(this.history,await this.getMsg(message_id))
    }
    _sendMsg(message:Bot.Message):Promise<Bot.MessageRet>{
        const message_id=Random.id()
        const result={
            message_id,
            ...message
        }
        this.history.push(result)
        return Promise.resolve(result)
    }
}