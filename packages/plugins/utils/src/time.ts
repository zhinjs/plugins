import moment from 'moment'
import {Context} from "zhin";
export const name='time'
export function install(ctx:Context){
    const p=ctx.command('utils/time [timeStr:string]')
        .desc('日期操作（默认当前）')
        .option('-f [format:string] 输出格式','YYYY-MM-DD HH:mm:ss')
        .action(({options},timeStr)=>{
            const timeValue:string|Date=timeStr && /^\d+$/.test(timeStr)?new Date(Number(timeStr)*1000):timeStr
            return moment(timeValue).format(options.format)
        })
    p.command('time.year [timeStr:string]')
        .desc("输出指定日期的年（默认当前）")
        .action(({options},timeStr)=>{
            const timeValue:string|Date=timeStr && /^\d+$/.test(timeStr)?new Date(Number(timeStr)*1000):timeStr
            return moment(timeValue).year()+''
        })
    p.command('time.month [timeStr:string]')
        .desc('输出指定日期的月（默认当前）')
        .action(({options},timeStr)=>{
            const timeValue:string|Date=timeStr && /^\d+$/.test(timeStr)?new Date(Number(timeStr)*1000):timeStr
            return moment(timeValue).month()+1+''
        })
    p.command('time.day [timeStr:string]')
        .desc('输出指定日期的日（默认当前）')
        .action(({options},timeStr)=>{
            const timeValue:string|Date=timeStr && /^\d+$/.test(timeStr)?new Date(Number(timeStr)*1000):timeStr
            return moment(timeValue).date()+''
        })
    p.command('time.days [timeStr:string]')
        .desc('输出指定日期所在月的天数（默认当前）')
        .action(({options},timeStr)=>{
            const timeValue:string|Date=timeStr && /^\d+$/.test(timeStr)?new Date(Number(timeStr)*1000):timeStr
            return moment(timeValue).daysInMonth()+''
        })
    p.command('time.hour [timeStr:string]')
        .desc('输出指定日期的小时数（默认当前）')
        .action(({options},timeStr)=>{
            const timeValue:string|Date=timeStr && /^\d+$/.test(timeStr)?new Date(Number(timeStr)*1000):timeStr
            return moment(timeValue).hour()+''
        })
    p.command('time.minute [timeStr:string]')
        .desc('输出指定日期的分钟数（默认当前）')
        .action(({options},timeStr)=>{
            const timeValue:string|Date=timeStr && /^\d+$/.test(timeStr)?new Date(Number(timeStr)*1000):timeStr
            return moment(timeValue).minute()+''
        })
    p.command('time.second [timeStr:string]')
        .desc('输出指定日期的秒数（默认当前）')
        .action(({options},timeStr)=>{
            const timeValue:string|Date=timeStr && /^\d+$/.test(timeStr)?new Date(Number(timeStr)*1000):timeStr
            return moment(timeValue).second()+''
        })
    p.command('time.isLeap [timeStr:string]')
        .desc('输出指定日期是否闰年（默认当前）')
        .action(({options},timeStr)=>{
            const timeValue:string|Date=timeStr && /^\d+$/.test(timeStr)?new Date(Number(timeStr)*1000):timeStr
            return moment(timeValue).isLeapYear().toString()+''
        })
}
