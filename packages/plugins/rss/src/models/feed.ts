import {DataTypes} from 'sequelize'
import {TableDecl} from "@zhinjs/plugin-database";
export namespace Feed{
    export const table:TableDecl={
        creator_id:{
            type:DataTypes.DECIMAL,
            comment:'创建人'
        },
        url:{
            type:DataTypes.TEXT,
            comment:'订阅url'
        },
        target_type:{
            type:DataTypes.TEXT,
            comment:'订阅者类型'
        },
        target_id:{
            type:DataTypes.INTEGER,
            comment:'订阅者类型'
        },
        title:{
            type:DataTypes.TEXT,
            comment:'订阅内容标题'
        },
        template:{
            type:DataTypes.TEXT,
            comment:'输出模板'
        }
    }
    export interface Types{
        creator_id:number
        url:string
        target_type:string
        target_id:number
        title:string
        template?:string
    }
}