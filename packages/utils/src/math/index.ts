import {Bot} from "zhin";
import * as random from './random'
export const name='math'
export function install(bot:Bot) {
    const p=bot.command('utils/math')
        .desc('数学计算工具')
    p.subcommand('math.max <...nums:number>')
        .desc('返回nums中的最大值')
        .action((_,...num)=>{
            return Math.max(...num).toString()
        })
    p.subcommand('math.min <...nums:number>')
        .desc('返回nums中的最小值')
        .action((_,...num)=>{
            return Math.min(...num).toString()
        })
    p.subcommand('math.sum <...nums:number>')
        .desc('返回nums相加的和')
        .action((_,...num)=>{
            return num.reduce((a,b)=>a+b,0).toString()
        })
    p.subcommand('math.round <num:number>')
        .desc('返回num四舍五入后最接近的整数')
        .action((_,num)=>{
            return Math.round(num).toString()
        })
    p.subcommand('math.exp <num:number>')
        .desc('返回num的e次幂')
        .action((_,num)=>{
            return Math.exp(num).toString()
        })
    p.subcommand('math.log <num:number>')
        .desc('返回num的自然对数')
        .action((_,num)=>{
            return Math.log(num).toString()
        })
    p.subcommand('math.sqrt <num:number>')
        .desc('返回num的平方根')
        .action((_,num)=>{
            return Math.sqrt(num).toString()
        })
    p.subcommand('math.pow <num:number> [exponent:number]')
        .desc('返回num的exponent次幂')
        .action((_,num,exponent)=>{
            return Math.pow(num,exponent).toString()
        })
    p.subcommand('math.floor <num:number>')
        .desc('返回<=num的最大整数')
        .action((_,num)=>{
            return Math.floor(num).toString()
        })
    p.subcommand('math.ceil <num:number>')
        .desc('返回>=num的最大整数')
        .action((_,num)=>{
            return Math.ceil(num).toString()
        })
    p.subcommand('math.cos <num:number>')
        .desc('返回num的余弦值')
        .action((_,num)=>{
            return Math.cos(num).toString()
        })
    p.subcommand('math.sin <num:number>')
        .desc('返回num的正弦值')
        .action((_,num)=>{
            return Math.sin(num).toString()
        })
    p.subcommand('math.tan <num:number>')
        .desc('返回num的正切值')
        .action((_,num)=>{
            return Math.tan(num).toString()
        })
    bot.plugin(random)
}
