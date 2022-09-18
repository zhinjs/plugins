import {DataTypes} from "sequelize";
import {TableDecl} from "../index";
export namespace GroupTable{
    export interface Types{
        id:number
        group_id:number
        name:string
        ignore:boolean
    }
    export const model:TableDecl={
        group_id:DataTypes.BIGINT,
        name:DataTypes.STRING,
        ignore:DataTypes.BOOLEAN
    }
}
