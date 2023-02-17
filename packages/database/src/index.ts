import {Context, Dict, Dispose, omit, Schema, useOptions} from "zhin";
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

export function install(ctx: Context) {
    const options = Config(useOptions('services.database'))
    ctx.service('database', Database, options as Options)
    // 这儿可以定义表结构
    ctx.app.emit('database-created')
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
        this.sequelize = new Sequelize({...options, logging: (text) => this.logger.debug(text)})
        this.define('User', UserTable.model)
        this.define('Group', GroupTable.model)
        this.ctx.setTimeout(() => {
            this.start()
        }, 200)
    }

    async start() {
        await this.ctx.app.emitSync('database-created')
        this.ctx.app.listeners('database-create').map((l)=>console.log(l+''))
        Object.entries(this.modelDecl).forEach(([name, decl]) => {
            this.sequelize.define(name, decl, {timestamps: false})
        })
        await this.ctx.app.emitSync('database-mounted')
        // 这儿可以定义表关系
        await this.sequelize.sync({alter: true})
        await this.ctx.app.emitSync('database-ready')
        this.isReady = true
        this.connect()
    }
    async restart(){
        await this.disconnect()
        await this.start()

    }
    get models(): Record<string, ModelStatic<Model>> {
        return this.sequelize.models
    }

    model(name: string): ModelStatic<Model> {
        return this.models[name]
    }

    get(modelName: string, condition?: Dict) {
        return this.model(modelName).findAll({where: condition})
    }

    set(modelName: string, condition: Dict, value: Dict) {
        return this.model(modelName).update(value, {where: condition})
    }

    add(modelName: string, ...values: Dict[]) {
        return this.model(modelName).bulkCreate(values)
    }

    delete(modelName: string, condition: Dict) {
        return this.model(modelName).destroy({where: condition})
    }

    connect() {
        const dispose = this.ctx.app.on('before-message', async (session) => {
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
                Object.assign(session.group, omit(groupInfo.toJSON(), ['group_id', 'name']))
                Object.assign(session.member, omit(userInfo.toJSON(), ['user_id', 'name']))
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
                Object.assign(session.discuss, omit(groupInfo.toJSON(), ['group_id', 'name']))
            } else {
                Object.assign(session.friend || session.user, omit(userInfo.toJSON(), ['user_id', 'name']))
            }
        })
        this.disposes.push(dispose)
    }

    async disconnect() {
        await this.ctx.app.emitSync('database-disposed')
        while (this.disposes.length) {
            this.disposes.shift()()
        }

        await this.sequelize.close()
    }

    get logger() {
        return this.ctx.logger
    }

    extend(name: string, decl: TableDecl) {
        const _decl: TableDecl = this.modelDecl[name]
        if (!decl) return this.define(name, decl)
        Object.assign(_decl, decl)
        return this
    }

    define(name: string, decl: TableDecl) {
        if (this.modelDecl[name]) return this.extend(name, decl)
        this.modelDecl[name] = decl
        return this
    }
}

