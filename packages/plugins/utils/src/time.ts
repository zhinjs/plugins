import moment from 'moment'
import {Context} from "zhin";
export const name='time'
export function install(ctx:Context){
    const p=ctx.command('utils/time [timeStr:string]')
        .desc('日期操作（默认当前）')
        .option('format','-f [format:test] 输出格式',{initial:'YYYY-MM-DD HH:mm:ss'})
        .action(({options},timeStr)=>{
            const timeValue:string|Date=timeStr && /^\d+$/.test(timeStr)?new Date(Number(timeStr)*1000):timeStr
            return moment(timeValue).format(options.format)
        })
    p.subcommand('time.year [timeStr:string]')
        .desc("输出指定日期的年（默认当前）")
        .action(({options},timeStr)=>{
            const timeValue:string|Date=timeStr && /^\d+$/.test(timeStr)?new Date(Number(timeStr)*1000):timeStr
            return moment(timeValue).year()+''
        })
    p.subcommand('time.month [timeStr:string]')
        .desc('输出指定日期的月（默认当前）')
        .action(({options},timeStr)=>{
            const timeValue:string|Date=timeStr && /^\d+$/.test(timeStr)?new Date(Number(timeStr)*1000):timeStr
            return moment(timeValue).month()+1+''
        })
    p.subcommand('time.day [timeStr:string]')
        .desc('输出指定日期的日（默认当前）')
        .action(({options},timeStr)=>{
            const timeValue:string|Date=timeStr && /^\d+$/.test(timeStr)?new Date(Number(timeStr)*1000):timeStr
            return moment(timeValue).date()+''
        })
    p.subcommand('time.days [timeStr:string]')
        .desc('输出指定日期所在月的天数（默认当前）')
        .action(({options},timeStr)=>{
            const timeValue:string|Date=timeStr && /^\d+$/.test(timeStr)?new Date(Number(timeStr)*1000):timeStr
            return moment(timeValue).daysInMonth()+''
        })
    p.subcommand('time.hour [timeStr:string]')
        .desc('输出指定日期的小时数（默认当前）')
        .action(({options},timeStr)=>{
            const timeValue:string|Date=timeStr && /^\d+$/.test(timeStr)?new Date(Number(timeStr)*1000):timeStr
            return moment(timeValue).hour()+''
        })
    p.subcommand('time.minute [timeStr:string]')
        .desc('输出指定日期的分钟数（默认当前）')
        .action(({options},timeStr)=>{
            const timeValue:string|Date=timeStr && /^\d+$/.test(timeStr)?new Date(Number(timeStr)*1000):timeStr
            return moment(timeValue).minute()+''
        })
    p.subcommand('time.second [timeStr:string]')
        .desc('输出指定日期的秒数（默认当前）')
        .action(({options},timeStr)=>{
            const timeValue:string|Date=timeStr && /^\d+$/.test(timeStr)?new Date(Number(timeStr)*1000):timeStr
            return moment(timeValue).second()+''
        })
    p.subcommand('time.isLeap [timeStr:string]')
        .desc('输出指定日期是否闰年（默认当前）')
        .action(({options},timeStr)=>{
            const timeValue:string|Date=timeStr && /^\d+$/.test(timeStr)?new Date(Number(timeStr)*1000):timeStr
            return moment(timeValue).isLeapYear().toString()+''
        })
}
