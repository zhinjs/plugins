import {Bot, template} from "zhin";
import {TaskStep, Task} from "./model";
import '@zhinjs/plugin-database'
import '@zhinjs/plugin-prompt'
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
    namespace Bot {
        interface Services {
            tasks: Tasks
        }
    }
}

export interface Pagination {
    pageSize: number
    pageNum: number
}
export const using=['database','prompt']
export function install(bot:Bot){
    const taskService=new Tasks(bot)
    bot.service('tasks',taskService)
    bot.command('task [id:integer]')
        .desc('任务管理')
        .option('list', '-l 查看已有任务', {initial: true})
        .option('pageNum', '/ <pageNum:integer> 查看指定页', {initial: 1})
        .option('search', '-s <keyword:string> 搜索指定名称的任务')
        .option('remove', '-r 移除指定任务')
        .shortcut(/^删除任务(\d+)$/, {options: {remove: true}, args: ['$1']})
        .action(async ({options, event}, id) => {
            if (options.remove) {
                if (!id) return '未指定任务id'
                await this.taskModel.destroy({where: {id}})
                return `已删除任务${id}`
            }
            const condition: Partial<Task> = {},
                pagination: Pagination = {pageNum: options.pageNum || 1, pageSize: 15}
            if (options.search) condition.name = options.search
            const result = await taskService.query(condition, pagination)
            return template('task.list', result.map(task => template('task.info', task.id, task.name, task.desc)).join('\n'))
        })
    bot.command('task/task.add')
        .desc('新增任务')
        .shortcut('新增任务')
        .action(async ({event}, name) => {
            const result = await taskService.modifyTask(event)
            if (typeof result === 'string') return result
            return `添加任务(${result.id})成功`
        })
    bot.command('task/task.edit [id:integer]')
        .desc('编辑任务')
        .shortcut('编辑任务')
        .auth("admins")
        .action(async ({event}, id) => {
            const result = await taskService.modifyTask( event, id)
            if (typeof result === 'string') return result
            return `编辑任务(${result.id})成功`
        })
    bot.command('task/task.info [id:integer]')
        .desc('查看任务详情')
        .shortcut(/^查看任务(\d+)/, {args: ['$1']})
        .auth('admins')
        .action(async ({event}, id) => {
            const task = await taskService.detail(id)
            if (!task) return `无效的任务id(${id})`
            return template('task.info', task.id, task.name, task.desc) + template('task.steps', (task.steps || []).map(step => {
                return template('task.step', step.index, step.template)
            }).join('\n'))
        })
    bot.command('task/task.run [id:integer]')
        .desc('执行指定任务')
        .shortcut(/^执行任务(\d+)/, {args: ['$1']})
        .auth("admins")
        .action(async ({event}, id) => {
            const task = await taskService.detail(id)
            if (!task) return `无效的任务id(${id})`
            await event.reply(`正在执行任务${id}...`)
            for (const step of task.steps) {
                try {
                    const result=await bot.execute({
                        event,
                        name:'exec',
                        args:[step.template]
                    })
                    if(result && typeof result!=='boolean') await event.reply(result)
                } catch (e) {
                    return e.message
                }
            }
            return `任务执行完成`
        })
    bot.once('ready',()=>{
        const {Task, TaskStep} = bot.database.models
        Task.hasMany(TaskStep, {as: 'steps'})
        TaskStep.belongsTo(Task)
    })
}
class Tasks {
    constructor(public bot: Bot) {
        bot.database.define('Task', Task)
        bot.database.define('TaskStep', TaskStep)
    }

    get taskModel() {
        return this.bot.database.models.Task
    }

    get stepModel() {
        return this.bot.database.models.TaskStep
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

    async modifyTask(event: Bot.MessageEvent, id?: number) {
        let stepAddFinished: boolean = false
        const task: TaskWithSteps = (await event.prompt.prompts({
            name:{
                type: 'text',
                message: '请输入任务名称',
            },
            desc:{
                type: 'text',
                message: '请输入任务描述',
            }
        })) as Task
        if (!task) return '输入超时'
        while (!stepAddFinished) {
            const steps = task.steps ||= []
            const step = await event.prompt.prompts({
                template:{
                    type: 'text',
                    message: `第${steps.length + 1}步：\n请输入需要执行的指令`,
                },
                hasMore:{
                    type: 'confirm',
                    message: '是否继续添加',
                }
            })
            if (!step) return '输入超时'
            steps.push({index: steps.length + 1, template: step.template})
            if (!step.hasMore) break;
        }
        return await this.changeTask({id, creator: event.user_id, ...task})
    }
}
