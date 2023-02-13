import {Context} from "zhin";
import '@zhinjs/plugin-database'
import {QA} from "./models";
import * as teach from './teach'
import * as receiver from './receiver'
export const name='qa'
export const using=['database']
export function install(ctx:Context){
    if(ctx.database){
        ctx.database.define('QA',QA)
    }else{
        ctx.app.on('database-created',()=>{
            ctx.database.define('QA',QA)
        })
    }
    ctx.database.define('QA',QA)
    ctx.plugin(teach)
    ctx.plugin(receiver)
}