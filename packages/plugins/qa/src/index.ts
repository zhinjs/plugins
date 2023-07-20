import {Context} from "zhin";
import '@zhinjs/plugin-database'
import {QA} from "./models";
import * as teach from './teach'
import * as receiver from './receiver'

export const name = 'qa'
export const using = ['database']

export async function install(ctx: Context) {

    await ctx.beforeReady(async () => {
        ctx.disposes.push(
            await ctx.database.onCreated(() => {
                ctx.database.define('QA', QA)
            }),
            await ctx.database.onReady(() => {
                ctx.database.sequelize.sync({alter: {drop: true}})
            })
        )
    })
    ctx.plugin(teach)
    ctx.plugin(receiver)
}
