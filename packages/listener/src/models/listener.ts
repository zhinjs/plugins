import {DataTypes} from 'sequelize'
import {TableDecl} from "@zhinjs/plugin-database";
export const Listener:TableDecl={
    creator:DataTypes.INTEGER,
    eventName:DataTypes.STRING,
    condition:DataTypes.TEXT,
    callback:DataTypes.STRING,
    template:DataTypes.TEXT
}