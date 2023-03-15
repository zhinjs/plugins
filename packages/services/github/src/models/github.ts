import {DataTypes} from 'sequelize'
import {TableDecl} from "@zhinjs/plugin-database";
export namespace GithubTable{
    export interface Types{
        name:string
        secret:string
    }
    export const model:TableDecl={
        name:DataTypes.STRING,
        secret:DataTypes.STRING,
    }
}
