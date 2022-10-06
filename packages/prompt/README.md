# plugin-prompt
> 为只能添加prompt能力
> 
> 其安装后会在message事件触发时，为其event添加prompt实例
> 
> 可通过实例化的prompt对象访问其提供的方法
## prompt实例方法
| 方法名            | 参数                                     | 描述                   |
|:---------------|:---------------------------------------|:---------------------|
| prompt.text    | msg 提示文本                               | 输入string类型内容         |
| prompt.number  | msg 提示文本                               | 输入number类型内容         |
| prompt.confirm | msg 提示文本                               | 输入boolean类型内容        |
| prompt.date    | msg 提示文本                               | 输入Date类型内容           |
| prompt.regexp  | msg 提示文本                               | 输入Regexp类型内容         |
| prompt.list    | msg 提示文本,{child_type}                  | 输入输入指定类型的array内容     |
| prompt.select  | msg 提示文本,{child_type,options,multiple} | 产生一个选择器，让用户自行选择一项或多项 |

## 食用方法

1. 安装插件

```shell
npm i @zhinjs/plugin-prompt
```

2. 在配置文件`zhin.yaml`中申明启用prompt

```yaml
# ... 其他配置
plugins:
  prompt: 60000
# ...其他配置
```

3. 在需要调用prompt的提供扩展能力的插件中申明其依赖prompt，确保能正常调用
```javascript
// 你的其他代码
module.exports={
    install(bot,config){
        // 你的插件逻辑代码
        bot.command('test')
            .action(async ({event})=>{
                const name=await event.prompt.text('请输入姓名')
            })
    },
    using:['prompt'] //声明其依赖prompt插件
}
```