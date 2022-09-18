import {Bot, Dict} from "zhin";
import {DataTypes} from 'sequelize'
import {TableDecl} from "@zhinjs/plugin-database";

export namespace CronTable{
    export interface Types{
        id: number
        time: Date
        lastCall: Date
        interval: number
        command: string
    }
    export const model:TableDecl={
        assignee:DataTypes.INTEGER,
        time:DataTypes.DATE,
        lastCall:DataTypes.DATE,
        interval:DataTypes.INTEGER,
        command:DataTypes.TEXT,
        event:{
            type:DataTypes.TEXT,
            get(){
                return JSON.parse(this.getDataValue('event')) as Bot.MessageEvent
            },
            set(event:Bot.MessageEvent){
                this.setDataValue('event',JSON.stringify(event))
            }
        }
    }
}