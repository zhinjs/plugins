import {Context,template} from "zhin";
import '@zhinjs/plugin-prompt'
import {Op} from "sequelize";
import {QA} from "./models";

export const DialogueCnMap = {
    id: 'ID',
    answer: '回答',
    isReg: '是否正则',
    question: '问题',
    probability: '触发概率权重(相同问题多个回答时，计算触发概率)',
    belongs: '触发条件',
    redirect: '重定向到',
    group: '群',
    private: '好友',
    discuss: '讨论组'
}

function transformDialogueValue(key, value) {
    if (key === 'belongs') {
        if (!value.length) return '所有消息均可触发'
        return value.map(item => `触发方式:${transformDialogueKey(item.type)}消息,指定${transformDialogueKey(item.type)}:${item.target}`).join('\n')
    }
    return value
}

function transformDialogueKey(key) {
    return DialogueCnMap[key] || key
}

function transformDialogue(dialogue: Dialogue) {
    return Object.keys(dialogue).map(key => {
        return `${transformDialogueKey(key)}:${transformDialogueValue(key, dialogue[key])}`
    }).join('\n')
}

export interface Dialogue extends Partial<QA>{}

template.set('teach', {
    'list': `已有问答如下:
{0}
{1}`,
    'detail': `问答({0})的详情:
{1}`,
    'add': `问答({0})已添加`,
    'edit': `问答({0})已更新`,
    'remove': `问答({0})已删除`,
    'pagination': '第{0}/{1}页，共{2}条',
    'search': `关键词({0})的搜索结果:
{1}
{2}`,
    '404': `{0}({1})未找到任何有关问答`
})
export const using=['database','prompt']
export function install(ctx: Context) {
    ctx.command('qa [question:string] [answer:string]')
        .desc('问答管理')
        .option('list', '-l 查看问答列表')
        .option('detail', '-d 查看指定教学详情')
        .option('search', '-s <keyword:string> 搜索关键词')
        .option('remove', '-r 删除指定id的教学')
        .option('target', '-T <type> 操作类型', {hidden: true})
        .option('id', '-i <id:string> 操作id', {hidden: true})
        .option('regexp', '-x 是否为正则匹配')
        .option('redirect', '=> <question:string> 重定向到问题')
        .option('probability', '-p <probability:number> 触发概率')
        .option('trigger', '-t [trigger:string] 触发环境')
        .option('page', '/ <page:integer> 页码')
        .alias('#')
        .shortcut(/^## (\S+)$/, {options: {search: '$1'},fuzzy:true})
        .option('edit', '-e 是否为编辑')
        .shortcut(/^#(\d+) -([dr])$/, {options: {id: '$1', target: '$2'}})
        .example('`# -l` 查看第一页')
        .example('`# -l / 2` 查看第二页问答')
        .example('`# -s test` 搜索关键词为`test`的问答')
        .example('`# test hello -p 0.5` 当输入`test`时，回复`hello`，并设置该会带的概率权重为0.5')
        .example('`# test world` 将test的回答改为`world`')
        .action(async ({session, options}, q, a) => {
            if (Object.keys(options).filter(key => ['list', 'detail', 'search', 'edit', 'remove'].includes(key)).length > 1) {
                return '查询/列表/详情、编辑/删除只能同时调用一个'
            }
            if (options.id && options.target) {
                if (options.target === 'r') {
                    options.remove = true
                } else {
                    options.detail = true
                }
            }
            function filterResult(list) {
                const result=list.map(teach => teach.toJSON())
                    .filter((dialogue: Dialogue) => {
                        let trigger=options.trigger
                        if (trigger === undefined) {
                            trigger=`${session.detail_type}:${session['group_id']||session['discuss_id']||session.user_id}`
                        }
                        const tmpArr = trigger.split(',').map(str => {
                            const [t1, t2] = str.split(':')
                            return {
                                type: t1,
                                target: t2 ? t2 : '*'
                            }
                        }).filter(tmp => !!tmp.type)
                        return dialogue.belongs.length===0 || dialogue.belongs.some(belong => {
                            return tmpArr.some(tmp => tmp.type === belong.type && (belong.target==='*' ||belong.target.includes(tmp.target)))
                        })
                    })
                    .map((dialogue, idx) => `${idx + 1}. ID:${dialogue.id} 问题:${dialogue.question} 回答:${dialogue.answer} 是否正则:${dialogue.isReg ? '是' : '否'}${dialogue.redirect ? ` 重定向到:${dialogue.redirect}` : ''}`)
                return {
                    rows:result.filter((_,index)=>index>=((options.page || 1)-1)*15 && index<(options.page||1)*15),
                    count:result.length
                }
            }

            function maybeRegExp(question: string) {
                return question.startsWith('^') || question.endsWith('$')
            }
            if (options.search) {
                const condition = {
                    where: {
                        [Op.or]: {
                            question: {[Op.like]: `%${options.search}%`},
                            answer: {[Op.like]: `%${options.search}%`},
                        }
                    },
                    sort: [['createdAt', 'DESC']],
                }
                if (options.page) {
                    if (!Number.isInteger(options.page) || options.page < 1) return '页码只能为正整数'
                }
                const data = await ctx.database.models.QA.findAll(condition)
                const {rows,count}=filterResult(data)
                return template('teach.search', options.search, rows.join('\n'), template('teach.pagination', options.page || 1, Math.ceil(count / 15), count))
            }
            if (options.list) {
                const condition = {
                    where: {},
                    sort: [['createdAt', 'DESC']],
                }
                if (options.page) {
                    if (!Number.isInteger(options.page) || options.page < 1) return '页码只能为正整数'
                }
                const data = await ctx.database.models.QA.findAll(condition)
                const {rows,count}=filterResult(data)
                return template('teach.list', rows.join('\n'), template('teach.pagination', options.page || 1, Math.ceil(count / 15), count))
            }
            if (options.detail) {
                const teach = await ctx.database.models.QA.findOne({
                    attributes: ['id', 'question', 'answer', 'isReg', 'redirect', 'probability', 'belongs'],
                    where: {
                        id: options.id
                    }
                })
                if (!teach) {
                    return template('teach.404', 'ID', options.id)
                }
                const dialogue = teach.toJSON()
                return template('teach.detail', options.id, transformDialogue(dialogue))
            }
            if (options.remove) {
                const dialogue = await ctx.database.models.QA.destroy({
                    where: {
                        id: options.id
                    }
                })
                if (dialogue) {
                    return template('teach.remove', options.id)
                }
            }
            if (q) {
                const data: Dialogue = {
                    isReg: !!options.regexp
                }
                if (a) {
                    data.answer = a
                }
                if (options.probability) {
                    data.probability = options.probability
                }
                if (options.trigger !== undefined) {
                    data.belongs = options.trigger.split(',').map(trigger => {
                        const [type, target] = trigger.split(':')
                        return {
                            type,
                            target: target ? target : '*'
                        }
                    }).filter(belong => !!belong.type)
                }
                if (options.redirect) {
                    data.redirect = options.redirect
                }
                let dialogues = await ctx.database.models.QA.findAll({
                    where: {
                        question: q,
                    }
                })
                let [dialogue] = dialogues
                if (options.edit) {
                    if (dialogues.length > 1) {
                        await session.reply(template('teach.list', filterResult(dialogues).rows.join('\n'), '请输入要编辑的问答索引'))
                        const index = await session.prompt.select('请选择要编辑的问答',{
                            child_type:'number',
                            options:filterResult(dialogues).rows.map((item,i)=>({title:item,value:i}))
                        })
                        if(typeof index !=='number') return '输入超时'
                        if (index < 1 || index > dialogues.length) {
                            await session.reply('输入错误')
                            return
                        }
                        dialogue = dialogues[index - 1]
                    }
                    if (!dialogue) {
                        return template('teach.404', '问题', q)
                    }
                    await dialogue.update(data)
                    return template('teach.edit', dialogue.get('id'))
                }
                if(dialogue && dialogue.get('answer')===a){
                    const confirm=await session.prompt.confirm('已存在相同问答，是否继续添加？')
                    if(!confirm) return '已取消添加'
                }
                dialogue = await ctx.database.models.QA.create({
                    ...data,
                    question: q,
                })
                return template('teach.add', dialogue.get('id'))
            }
        })
}
