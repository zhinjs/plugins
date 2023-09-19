import {h, Random} from "zhin";
import {Context} from "zhin";

export const name = 'random'

export function install(ctx: Context) {
    const p = ctx.command('utils/math/math.random')
        .desc('随机数计算')
        .action(() => {
            return Math.random().toString()
        })
    ctx.command('utils/math/random.int <min:integer> [max:integer]')
        .desc('在指定范围生成随机数,未传max时，min为0，max为min')
        .action((_, min, max) => {
            if (!max && min !== undefined) {
                max = min;
                min = 0
            }
            return Random.int(min, max).toString()
        })
    ctx.command('utils/math/random.boolean')
        .alias('random.bool')
        .option('-p [probability:number] 可选，概率，默认0.5', 0.5)
        .desc('生成随机布尔值')
        .action(({options: {probability}}) => {
            return Random.bool(probability).toString()
        })
    ctx.command('utils/math/random.pick <...items:any>')
        .alias('random.choice')
        .desc('从列表中随机选择一个元素')
        .action((_, ...items) => {
            return h('random',...items)
        })
}
