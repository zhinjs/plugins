import {DataTypes} from 'sequelize'
export const Task={
    name:DataTypes.STRING,
    desc:DataTypes.TEXT,
    creator:DataTypes.BIGINT
}
export interface Task{
    id:number
    name:string
    desc:string
    creator:number
}
