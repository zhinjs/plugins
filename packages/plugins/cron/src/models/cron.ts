import {Context} from "zhin";
import {DataTypes} from 'sequelize'
import {TableDecl} from "@zhinjs/plugin-database";
import {Session} from "zhin";

export namespace CronTable{
    export interface Types{
        id: number
        time: Date
        lastCall: Date
        interval: number
        command: string
    }
    export const model:TableDecl={
        assignee:DataTypes.STRING,
        time:DataTypes.DATE,
        lastCall:DataTypes.DATE,
        interval:DataTypes.INTEGER,
        command:DataTypes.TEXT,
        session:{
            type:DataTypes.TEXT,
            get(){
                return JSON.parse(this.getDataValue('session')) as Session
            },
            set(event:Session){
                this.setDataValue('session',JSON.stringify(event))
            }
        }
    }
}
