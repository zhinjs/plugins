import {Context, Session, template, Element, h} from "zhin";
import {TaskStep, Task} from "./model";
import '@zhinjs/plugin-database'
import {Model} from "sequelize";

interface TaskWithSteps extends Task {
    steps?: TaskStep[]
}

template.set('task', {
    list: `相关任务：\n{0}`,
    info: '任务id:{0}\n任务名:{1}\n任务描述:{2}\n',
    step: '第{0}步:{1}',
    steps: '执行指令详情:\n{0}'
})
declare module 'zhin' {
    namespace Zhin {
        interface Services {
            tasks: Tasks
        }
    }
}

export interface Pagination {
    pageSize: number
    pageNum: number
}

export const use = ['database']

export function install(ctx: Context) {
    const taskService = new Tasks(ctx)
    ctx.service('tasks', taskService)
    ctx.command('task [id:integer]')
        .desc('任务管理')
        .option('-l [list:boolean] 查看已有任务', true)
        .option('-p [pageNum:integer] 查看指定页', 1)
        .option('-s [search:string] 搜索指定名称的任务')
        .option('-r [remove:boolean] 移除指定任务')
        .sugar(/^删除任务(\d+)$/, {options: {remove: true}, args: ['$1']})
        .action(async ({options, session}, id) => {
            if (options.remove) {
                if (!id) return '未指定任务id'
                await this.taskModel.destroy({where: {id}})
                return `已删除任务${id}`
            }
            const condition: Partial<Task> = {},
                pagination: Pagination = {pageNum: options.pageNum || 1, pageSize: 15}
            if (options.search) condition.name = options.search
            const result = await taskService.query(condition, pagination)
            return h("text",{text:template('task.list', result.map(task => template('task.info', task.id, task.name, task.desc)).join('\n'))})
        })
    ctx.command('task/task.add')
        .desc('新增任务')
        .alias('新增任务')
        .action<Session>(async ({session}, name) => {
            const result = await taskService.modifyTask(session)
            if (typeof result === 'string') return result
            return `添加任务(${result.id})成功`
        })
    ctx.command('task/task.edit [id:integer]')
        .desc('编辑任务')
        .alias('编辑任务')
        .action<Session>(async ({session}, id) => {
            const result = await taskService.modifyTask(session, id)
            if (typeof result === 'string') return result
            return `编辑任务(${result.id})成功`
        })
    ctx.command('task/task.info [id:integer]')
        .desc('查看任务详情')
        .sugar(/^查看任务(\d+)/, {args: ['$1']})
        .action(async ({session}, id) => {
            const task = await taskService.detail(id)
            if (!task) return `无效的任务id(${id})`
            return h('text',{text:template('task.info', task.id, task.name, task.desc) + template('task.steps', (task.steps || []).map(step => {
                    return template('task.step', step.index, step.template)
                }).join('\n'))})
        })
    ctx.command('task/task.run [id:integer]')
        .desc('执行指定任务')
        .sugar(/^执行任务(\d+)/, {args: ['$1']})
        .action<Session>(async ({session}, id) => {
            const task = await taskService.detail(id)
            if (!task) return `无效的任务id(${id})`
            await session.reply(`正在执行任务${id}...`)
            for (const step of task.steps) {
                try {
                    const result = await session.execute(step.template)
                    if (result && typeof result !== 'boolean') await session.reply(result)
                } catch (e) {
                    return e.message
                }
            }
            return `任务执行完成`
        })
}

class Tasks {
    constructor(public ctx: Context) {
        this.init()
    }

    get taskModel() {
        return this.ctx.database.models.Task
    }

    get stepModel() {
        return this.ctx.database.models.TaskStep
    }

    async changeTask(data: TaskWithSteps): Promise<TaskWithSteps> {
        const {steps = [], ...task} = data
        let taskInstance: Model
        if (task.id) {
            taskInstance = await this.taskModel.findOne({where: {id: task.id}})
        } else {
            taskInstance = await this.taskModel.create({...task})
        }
        await taskInstance.update(task)
        if (steps.length) {
            const stepInstances = await this.stepModel.bulkCreate(steps as unknown as any)
            // @ts-ignore
            taskInstance.setSteps(stepInstances)
        }
        return taskInstance.toJSON()
    }
    async init(){
        this.ctx.disposes.push(
            await this.ctx.beforeReady(async () => {
                this.ctx.disposes.push(
                    await this.ctx.database.onCreated(() => {
                    this.ctx.database.define('Task', Task)
                    this.ctx.database.define('TaskStep', TaskStep)
                    this.ctx.disposes.push(()=>{
                        this.ctx.database.delete('Task')
                        this.ctx.database.delete('TaskStep')
                        })
                    }),
                    await this.ctx.database.onMounted(() => {
                        const {Task, TaskStep} = this.ctx.database.models
                        Task.hasMany(TaskStep, {as: 'steps'})
                        TaskStep.belongsTo(Task)
                    })
                )

            })
        )
    }
    query(condition: string | Partial<Task> = {}, pagination: Pagination = {pageNum: 1, pageSize: 15}) {
        if (typeof condition === 'string') condition = {name: condition}
        Object.keys(condition).forEach(key => {
            condition[key] = `%${condition[key]}%`
        })
        return this.list(condition, pagination)
    }

    async list(query: Partial<Task> = {}, pagination: Pagination = {pageNum: 1, pageSize: 15}) {
        const offset = (pagination.pageNum - 1) * pagination.pageSize
        return (await this.taskModel.findAll({
            where: query,
            offset,
            limit: pagination.pageSize,
        })).map(_ => _.toJSON()) as Task[]
    }

    async detail(id: number) {
        return (await this.taskModel.findOne({
            where: {id},
            include: {model: this.stepModel, as: 'steps'}
        })).toJSON() as TaskWithSteps
    }

    async modifyTask(session: Session, id?: number) {
        let stepAddFinished: boolean = false
        const task: TaskWithSteps = (await session.prompt.prompts({
            name: {
                type: 'text',
                message: '请输入任务名称',
            },
            desc: {
                type: 'text',
                message: '请输入任务描述',
            }
        })) as Task
        if (!task) return '输入超时'
        while (!stepAddFinished) {
            const steps = task.steps ||= []
            const step = await session.prompt.prompts({
                template: {
                    type: 'text',
                    message: `第${steps.length + 1}步：\n请输入需要执行的指令`,
                },
                hasMore: {
                    type: 'confirm',
                    message: '是否继续添加',
                }
            })
            if (!step) return '输入超时'
            steps.push({index: steps.length + 1, template: step.template})
            if (!step.hasMore) break;
        }
        return await this.changeTask({id, creator: session.user_id, ...task})
    }
}
