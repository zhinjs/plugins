import {DataTypes} from "sequelize";
export const QA={
    question:DataTypes.TEXT,
    answer:DataTypes.TEXT,
    isReg:DataTypes.BOOLEAN,
    probability:{
        type:DataTypes.FLOAT,
        defaultValue:1
    },
    redirect:DataTypes.TEXT,
    belongs:{
        type:DataTypes.TEXT,
        get(){
            const str=this.getDataValue('belongs')||''
            if(!str) return []
            return str.split(',').map(str=>{
                const [type,target]=str.split(':')
                return {type,target}
            })
        },
        set(data:{type,target}[]){
            const belongs=data.map(item=>`${item.type}:${item.target}`).join(',')
            this.setDataValue('belongs',belongs)
        }
    },
    creator:DataTypes.TEXT,
    useTimes:{
        type:DataTypes.INTEGER,
        defaultValue: 0
    }

}
export interface QA{
    question:string
    answer:string
    isReg:boolean
    probability:number
    redirect:string
    belongs: { type:string,target:string }[]
}
