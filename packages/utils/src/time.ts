import moment from 'moment'
import {Bot} from "zhin";
export const name='time'
export function install(bot:Bot){
    const p=bot.command('utils/time [timeStr]')
        .desc('日期操作（默认当前）')
        .option('format','-f [format:test] 输出格式',{initial:'YYYY-MM-DD HH:mm:ss'})
        .action(({options},timeStr)=>{
            return moment(timeStr?timeStr:undefined).format(options.format)
        })
    p.subcommand('time.year [timeStr]')
        .desc("输出指定日期的年（默认当前）")
        .action(({options},timeStr)=>{
            return moment(timeStr?timeStr:undefined).year()+''
        })
    p.subcommand('time.month [timeStr]')
        .desc('输出指定日期的月（默认当前）')
        .action(({options},timeStr)=>{
            return moment(timeStr?timeStr:undefined).month()+1+''
        })
    p.subcommand('time.day [timeStr]')
        .desc('输出指定日期的日（默认当前）')
        .action(({options},timeStr)=>{
            return moment(timeStr?timeStr:undefined).date()+''
        })
    p.subcommand('time.days [timeStr]')
        .desc('输出指定日期所在月的天数（默认当前）')
        .action(({options},timeStr)=>{
            return moment(timeStr?timeStr:undefined).daysInMonth()+''
        })
    p.subcommand('time.hour [timeStr]')
        .desc('输出指定日期的小时数（默认当前）')
        .action(({options},timeStr)=>{
            return moment(timeStr?timeStr:undefined).hour()+''
        })
    p.subcommand('time.minute [timeStr]')
        .desc('输出指定日期的分钟数（默认当前）')
        .action(({options},timeStr)=>{
            return moment(timeStr?timeStr:undefined).minute()+''
        })
    p.subcommand('time.second [timeStr]')
        .desc('输出指定日期的秒数（默认当前）')
        .action(({options},timeStr)=>{
            return moment(timeStr?timeStr:undefined).second()+''
        })
    p.subcommand('time.isLeap [timeStr]')
        .desc('输出指定日期是否闰年（默认当前）')
        .action(({options},timeStr)=>{
            return moment(timeStr?timeStr:undefined).isLeapYear().toString()+''
        })
}
