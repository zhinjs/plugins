import {Context, Dict, Dispose, omit, Schema, ToDispose, useOptions, Zhin} from "zhin";
import {Sequelize, Model, Options, DataType, ModelStatic} from "sequelize";

export * from 'sequelize'
import {GroupTable, UserTable} from "./tables";

export {GroupTable, UserTable}

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
    namespace Zhin {
        interface Services {
            database: Database
        }
    }

    interface Session {
        group_name?: string
        user_name?: string
        discuss?: GroupTable.Types
        discuss_name?: string
        group: GroupTable.Types
        friend?: UserTable.Types
        member?: UserTable.Types
        user: UserTable.Types
    }
}
export const name = 'database'
export const Config = Schema.object({
    dialect: Schema.union([
        Schema.const('mysql'),
        Schema.const('postgres'),
        Schema.const('sqlite'),
        Schema.const('mariadb'),
        Schema.const('mssql'),
        Schema.const('db2'),
        Schema.const('snowflake'),
    ]).description('数据库适配器').default('mysql'),
    dialectModule: Schema.dict(Schema.any()).default(null),
    dialectModulePath: Schema.string(),
    dialectOptions: Schema.dict(Schema.any()).default(null),
    storage: Schema.string(),
    database: Schema.string().description('数据库名').default('zhin'),
    username: Schema.string().description('用户名').default('root'),
    password: Schema.string().description('密码'),
    host: Schema.string().description('连接地址').default('localhost'),
    port: Schema.number().description('端口').default(3306),
    ssl: Schema.boolean().description('是否ssl'),
    protocol: Schema.string().description('协议'),
    timezone: Schema.string().description('时区')
})

export async function install(ctx: Context) {
    const options = Config(useOptions('services.database'))
    ctx.service('database', Database, options as Options)
    ctx.disposes.push(
        await ctx.zhin.beforeReady(async ()=>{
            ctx.database = ctx.service('database');
            await ctx.database.start()
        })
    )
    ctx.disposes.unshift(() => {
        ctx.database.disconnect()
    })
}
class Database {
    private modelDecl: Record<string, TableDecl> = {}
    public sequelize: Sequelize
    disposes: Dispose[] = []
    public isReady: boolean

    constructor(public ctx: Context, public options: Options) {
        this.sequelize = new Sequelize({...options, logging: (text) => this.logger.trace(`[sequelize] ${text}`)})
        this.define('User', UserTable.model);
        this.define('Group', GroupTable.model);
    }
    async onCreated<T>(fn:()=>T|Promise<T>):Promise<ToDispose<Zhin>>{
        if(this.isReady){
            this.ctx.zhin.logger.debug('【database hook:created】database is ready, run fn directly')
            const existKeys=Object.keys(this.modelDecl)
            fn()
            const addKeys=Object.keys(this.modelDecl).filter(key=>!existKeys.includes(key))

            this.ctx.zhin.logger.debug(`【database hook:created】add ${addKeys.length} models:${addKeys.join(',')}`);
            [...existKeys,...addKeys].forEach(key=>{
                // 重新定义之前，把之前的模型删除
                delete this.sequelize.models[key]
                this.sequelize.define(key, this.modelDecl[key], {timestamps: false})
            })
        }
        this.ctx.zhin.logger.debug('【database hook:created】database maybe reload, add created listener')
        return await this.ctx.on('database-created',fn)
    }
    async onMounted<T>(fn:()=>T|Promise<T>):Promise<ToDispose<Zhin>>{
        if(this.isReady){
            this.ctx.zhin.logger.debug('【database hook:mounted】database is ready, run fn directly')
            fn()
            this.ctx.zhin.logger.debug('【database hook:mounted】maybe add new model related, waiting sync...')
            await this.sequelize.sync({alter: {drop: false}})
        }
        this.ctx.zhin.logger.debug('【database hook:mounted】database maybe reload, add mount listener')
        return this.ctx.on('database-mounted',fn)
    }
    async onReady<T>(fn:()=>T|Promise<T>):Promise<ToDispose<Zhin>>{
        if(this.isReady){
            this.ctx.zhin.logger.debug('【database hook:ready】database is ready, run fn directly')
            fn()
        }
        this.ctx.zhin.logger.debug('【database hook:ready】database maybe reload, add ready listener')
        return this.ctx.on('database-ready',fn)
    }
    async start() {
        await this.ctx.emitSync('database-created')
        Object.entries(this.modelDecl).forEach(([name, decl]) => {
            this.sequelize.define(name, decl, {timestamps: false})
        })
        await this.ctx.emitSync('database-mounted')
        // 这儿可以定义表关系
        await this.sequelize.sync({alter: {drop: false}})
        await this.ctx.emitSync('database-ready')
        this.isReady = true
        this.connect();
    }
    async restart(){
        await this.disconnect()
        await this.start()

    }

    /**
     * 获取所有表模型
     */
    get models(): Record<string, ModelStatic<Model>> {
        return this.sequelize.models
    }

    /**
     * 获取指定表模型
     * @param name {string} 表名
     */
    model(name: string): ModelStatic<Model> {
        return this.models[name]
    }

    /**
     * 获取表数据
     * @param modelName {string} 表名
     * @param condition {Dict} 条件
     */
    get(modelName: string, condition?: Dict) {
        return this.model(modelName).findAll({where: condition})
    }

    /**
     * 更新表数据
     * @param modelName {string} 表名
     * @param condition {Dict} 条件
     * @param value {Dict} 更新的值
     */
    set(modelName: string, condition: Dict, value: Dict) {
        return this.model(modelName).update(value, {where: condition})
    }

    /**
     * 添加表中数据
     * @param modelName {string} 表名
     * @param values {Dict[]} 数据
     */
    add(modelName: string, ...values: Dict[]) {
        return this.model(modelName).bulkCreate(values)
    }

    /**
     * 删除表中的数据
     * @param modelName {string} 表名
     * @param condition {Dict} 条件
     */
    destroy(modelName: string, condition: Dict) {
        return this.model(modelName).destroy({where: condition})
    }

    connect() {
        const dispose = this.ctx.zhin.on('before-message', async (session) => {
            const {user_id, user_name = ''} = session
            const [userInfo] = await this.models.User.findOrCreate({
                where: {
                    user_id: session.user_id
                },
                defaults: {
                    authority: session.bot.isMaster(session) ? 7 : session.bot.isMaster(session) ? 4 : 1,
                    name: user_name,
                    user_id,
                    ignore: false
                }
            })
            if (session.detail_type === 'group') {
                const {group_id, group_name} = session
                const [groupInfo] = await this.models.Group.findOrCreate({
                    where: {group_id},
                    defaults: {
                        group_id,
                        name: group_name,
                        ignore: false
                    }
                })
                Object.assign(session.group||={} as any, omit(groupInfo.toJSON()||{}, ['group_id', 'name']))
                Object.assign(session.member||={} as any, omit(userInfo.toJSON()||{}, ['user_id', 'name']))
            } else if (session.detail_type === 'discuss') {
                const {discuss_id, discuss_name} = session
                const [groupInfo] = await this.models.Group.findOrCreate({
                    where: {group_id: discuss_id},
                    defaults: {
                        group_id: discuss_id,
                        name: discuss_name,
                        ignore: false
                    }
                })
                Object.assign(session.discuss||={} as any, omit(groupInfo.toJSON()||{}, ['group_id', 'name']))
            } else {
                Object.assign(session.friend || (session.user||={} as any), omit(userInfo.toJSON(), ['user_id', 'name']))
            }
        })
        this.disposes.push(dispose)
    }

    async disconnect() {
        await this.ctx.zhin.emitSync('database-disposed')
        while (this.disposes.length) {
            this.disposes.shift()()
        }

        await this.sequelize.close()
    }

    get logger() {
        return this.ctx.logger
    }

    /**
     * 扩展表模型定义
     * @param name {string} 表名
     * @param decl
     */
    extend(name: string, decl: TableDecl) {
        const _decl: TableDecl = this.modelDecl[name]
        if (!decl) return this.define(name, decl)
        Object.assign(_decl, decl)
        return this
    }

    /**
     * 删除表模型定义
     * @param name {string} 表名
     */
    delete(name: string) {
        delete this.modelDecl[name]
        return this
    }

    /**
     * 定义表模型
     * @param name {string} 表名
     * @param decl {TableDecl} 表模型定义
     */
    define(name: string, decl: TableDecl) {
        if (this.modelDecl[name]) return this.extend(name, decl)
        this.modelDecl[name] = decl
        return this
    }
}

