import moment from 'moment'
import {Bot} from "zhin";
export const name='time'
export function install(bot:Bot){
    const p=bot.command('utils/time [timeStr]')
        .desc('日期操作（默认当前）')
        .option('format','-f [format:test] 输出格式',{initial:'YYYY-MM-DD HH:mm:ss'})
        .action(({options},timeStr)=>{
            const timeValue:string|Date=timeStr && /^\d+$/.test(timeStr)?new Date(Number(timeStr)*1000):timeStr
            return moment(timeValue).format(options.format)
        })
    p.subcommand('time.year [timeStr]')
        .desc("输出指定日期的年（默认当前）")
        .action(({options},timeStr)=>{
            const timeValue:string|Date=timeStr && /^\d+$/.test(timeStr)?new Date(Number(timeStr)*1000):timeStr
            return moment(timeValue).year()+''
        })
    p.subcommand('time.month [timeStr]')
        .desc('输出指定日期的月（默认当前）')
        .action(({options},timeStr)=>{
            const timeValue:string|Date=timeStr && /^\d+$/.test(timeStr)?new Date(Number(timeStr)*1000):timeStr
            return moment(timeValue).month()+1+''
        })
    p.subcommand('time.day [timeStr]')
        .desc('输出指定日期的日（默认当前）')
        .action(({options},timeStr)=>{
            const timeValue:string|Date=timeStr && /^\d+$/.test(timeStr)?new Date(Number(timeStr)*1000):timeStr
            return moment(timeValue).date()+''
        })
    p.subcommand('time.days [timeStr]')
        .desc('输出指定日期所在月的天数（默认当前）')
        .action(({options},timeStr)=>{
            const timeValue:string|Date=timeStr && /^\d+$/.test(timeStr)?new Date(Number(timeStr)*1000):timeStr
            return moment(timeValue).daysInMonth()+''
        })
    p.subcommand('time.hour [timeStr]')
        .desc('输出指定日期的小时数（默认当前）')
        .action(({options},timeStr)=>{
            const timeValue:string|Date=timeStr && /^\d+$/.test(timeStr)?new Date(Number(timeStr)*1000):timeStr
            return moment(timeValue).hour()+''
        })
    p.subcommand('time.minute [timeStr]')
        .desc('输出指定日期的分钟数（默认当前）')
        .action(({options},timeStr)=>{
            const timeValue:string|Date=timeStr && /^\d+$/.test(timeStr)?new Date(Number(timeStr)*1000):timeStr
            return moment(timeValue).minute()+''
        })
    p.subcommand('time.second [timeStr]')
        .desc('输出指定日期的秒数（默认当前）')
        .action(({options},timeStr)=>{
            const timeValue:string|Date=timeStr && /^\d+$/.test(timeStr)?new Date(Number(timeStr)*1000):timeStr
            return moment(timeValue).second()+''
        })
    p.subcommand('time.isLeap [timeStr]')
        .desc('输出指定日期是否闰年（默认当前）')
        .action(({options},timeStr)=>{
            const timeValue:string|Date=timeStr && /^\d+$/.test(timeStr)?new Date(Number(timeStr)*1000):timeStr
            return moment(timeValue).isLeapYear().toString()+''
        })
}
