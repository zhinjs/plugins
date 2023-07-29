import {Context} from "zhin";
import '@zhinjs/plugin-database'
import {QA} from "./models";
import * as teach from './teach'
import * as receiver from './receiver'

export const name = 'qa'
export const use = ['database']

export async function install(ctx: Context) {
    ctx.disposes.push(
        await ctx.beforeReady(async () => {
            ctx.disposes.push(
                await ctx.database.onCreated(() => {
                    ctx.database.define('QA', QA)
                    ctx.disposes.push(()=>{
                        ctx.database.delete('QA')
                    })
                })
            )
        })
    )
    ctx.plugin(teach)
    ctx.plugin(receiver)
}
