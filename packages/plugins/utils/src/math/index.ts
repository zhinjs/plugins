import {Context} from "zhin";
import * as random from './random'
export const name='math'
export function install(ctx:Context) {
    ctx.command('utils/math')
        .desc('数学计算工具')
    ctx.command('utils/math.max <...nums:number>')
        .desc('返回nums中的最大值')
        .action((_,num)=>{
            return Math.max(...num).toString()
        })
    ctx.command('utils/math.min <...nums:number>')
        .desc('返回nums中的最小值')
        .action((_,num)=>{
            return Math.min(...num).toString()
        })
    ctx.command('utils/math.sum <...nums:number>')
        .desc('返回nums相加的和')
        .action((_,num)=>{
            return num.reduce((a,b)=>a+b,0).toString()
        })
    ctx.command('utils/math.round <num:number>')
        .desc('返回num四舍五入后最接近的整数')
        .action((_,num)=>{
            return Math.round(num).toString()
        })
    ctx.command('utils/math.exp <num:number>')
        .desc('返回num的e次幂')
        .action((_,num)=>{
            return Math.exp(num).toString()
        })
    ctx.command('utils/math.log <num:number>')
        .desc('返回num的自然对数')
        .action((_,num)=>{
            return Math.log(num).toString()
        })
    ctx.command('utils/math.sqrt <num:number>')
        .desc('返回num的平方根')
        .action((_,num)=>{
            return Math.sqrt(num).toString()
        })
    ctx.command('utils/math.pow <num:number> [exponent:number]')
        .desc('返回num的exponent次幂')
        .action((_,num,exponent)=>{
            return Math.pow(num,exponent).toString()
        })
    ctx.command('utils/math.floor <num:number>')
        .desc('返回<=num的最大整数')
        .action((_,num)=>{
            return Math.floor(num).toString()
        })
    ctx.command('utils/math.ceil <num:number>')
        .desc('返回>=num的最大整数')
        .action((_,num)=>{
            return Math.ceil(num).toString()
        })
    ctx.command('utils/math.cos <num:number>')
        .desc('返回num的余弦值')
        .action((_,num)=>{
            return Math.cos(num).toString()
        })
    ctx.command('utils/math.sin <num:number>')
        .desc('返回num的正弦值')
        .action((_,num)=>{
            return Math.sin(num).toString()
        })
    ctx.command('utils/math.tan <num:number>')
        .desc('返回num的正切值')
        .action((_,num)=>{
            return Math.tan(num).toString()
        })
    ctx.plugin(random)
}
