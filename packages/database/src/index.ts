import {Bot, Dict, omit, Plugin} from "zhin";
import {Sequelize, Model, Options, DataType, ModelStatic} from "sequelize";
export * from 'sequelize'
import {GroupTable,UserTable} from "./tables";
export {GroupTable,UserTable}

export namespace TableColumn {
    export interface Config {
        allowNull?: boolean
        field?: string
        defaultValue?: unknown
        type: DataType;
        unique?: boolean | string | { name: string; msg: string };
        primaryKey?: boolean;
        autoIncrement?: boolean;
        autoIncrementIdentity?: boolean;
        comment?: string;

        get?(): unknown
        set?(value: unknown): void
    }
}
export type TableDecl = Record<string, DataType | TableColumn.Config>
declare module 'zhin' {
    namespace Bot {
        interface Services {
            database: Database
        }
    }
}
declare module 'icqq'{
    interface User extends UserTable.Types{}
    interface Group extends GroupTable.Types{}
    interface Discuss extends GroupTable.Types{}
}
export const name='database'
export async function install(this:Plugin,bot:Bot,options:Options){
    // 传入服务构造函数和服务配置，系统将自动实例化该服务
    // 优点，减少代码书写
    // 缺点，在安装时无法添加卸载函数
    bot.service('database',Database,options)
    // 直接传入实例化后的服务
    // 优点，你可以自由控制添加的服务
    // 缺点，增加了书写量
    bot.service('database',new Database(bot,options))
    // 获取服务的方法
    bot.service('database')
    bot.on('ready',()=>bot.database.connect())
    if (bot.isReady){
        await bot.database.init()
        bot.database.connect()
    }
    this.disposes.push(()=>{
        bot.database.disconnect()
        delete bot.database
        return true
    })
}
export class Database {
    private modelDecl: Record<string, TableDecl> = {}
    public sequelize: Sequelize

    constructor(public bot:Bot,public options: Options) {
        this.sequelize = new Sequelize({...options, logging: (text) => this.logger.debug(text)})
        this.define('User', UserTable.model)
        this.define('Group', GroupTable.model)
        this.bot.before('ready', async () => {
            await this.init()
        })
    }

    get models(): Record<string, ModelStatic<Model>> {
        return this.sequelize.models
    }

    model(name: string): ModelStatic<Model> {
        return this.models[name]
    }
    get(modelName:string,condition?:Dict){
        return this.model(modelName).findAll({where:condition})
    }
    set(modelName:string,condition:Dict,value:Dict){
        return this.model(modelName).update(value,{where:condition})
    }
    add(modelName:string,...values:Dict[]){
        return this.model(modelName).bulkCreate(values)
    }
    delete(modelName:string,condition:Dict){
        return this.model(modelName).destroy({where:condition})
    }
    getMethods(modelName:string){
        const model=this.model(modelName)
        return {
            $update(){
                const {id,...others}=this
                return model.update({...others},{where:id})
            },
            $findAll(condition:Partial<Exclude<typeof this, '$update'|'$findAll'|'$findOne'>>){
                return model.findAll({where:condition})
            },
            $findOne(condition:Partial<typeof this>){
                return model.findOne({where:condition})
            }
        }
    }
    async init(){
        Object.entries(this.modelDecl).forEach(([name, decl]) => {
            this.sequelize.define(name, decl,{timestamps:false})
        })
        await this.sequelize.sync({alter: true})
    }
    connect() {
        this.bot.before('message', async (message) => {
            const {sender: {nickname, user_id}} = message
            const [userInfo] = await this.models.User.findOrCreate({
                where: {
                    user_id: message.user_id
                },
                defaults: {
                    authority: this.bot.isMaster(message.user_id)?7:this.bot.isAdmin(message.user_id)?4:1,
                    name: nickname,
                    user_id,
                    ignore: false
                }
            })
            if(message.message_type==='group'){
                const {group_id,group_name}=message
                const [groupInfo] = await this.models.Group.findOrCreate({
                    where:{group_id},
                    defaults: {
                        group_id,
                        name:group_name,
                        ignore: false
                    }
                })
                Object.assign(message.group,omit(groupInfo.toJSON(),['group_id','name']))
                Object.assign(message.member,omit(userInfo.toJSON(),['user_id','name']))
            }else if(message.message_type==='discuss'){
                const {discuss_id,discuss_name}=message
                const [groupInfo] = await this.models.Group.findOrCreate({
                    where:{group_id:discuss_id},
                    defaults: {
                        group_id:discuss_id,
                        name:discuss_name,
                        ignore: false
                    }
                })
                Object.assign(message.discuss,omit(groupInfo.toJSON(),['group_id','name']))
            }else{
                Object.assign(message.friend,omit(userInfo.toJSON(),['user_id','name']))
            }
        })
    }

    disconnect() {
        this.sequelize.close()
    }

    get logger() {
        return this.bot.logger
    }

    extend(name: string, decl: TableDecl) {
        const _decl: TableDecl = this.modelDecl[name]
        if (!decl) return this.define(name, decl)
        Object.assign(_decl, decl)
        return this
    }

    define(name: string, decl: TableDecl) {
        if(this.modelDecl[name]) return this.extend(name,decl)
        this.modelDecl[name] = decl
        return this
    }
}

