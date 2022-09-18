import {DataTypes} from "sequelize";
import {TableDecl} from "../index";
export namespace UserTable{
    export interface Types{
        id:number
        user_id:number
        authority:number
        name:string
        ignore:boolean
    }
    export const model:TableDecl={
        user_id:DataTypes.BIGINT,
        authority:DataTypes.INTEGER,
        name:DataTypes.STRING,
        ignore:DataTypes.BOOLEAN
    }
}
