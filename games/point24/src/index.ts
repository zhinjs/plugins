import {Random, useContext} from "zhin";
function calc24(...args:number[]){
    const expression = args.slice().sort();
    const operator = ['+','-','*','/'],result = [],hash = {};
    const dfs=(expression)=>{
        const len = expression.length;
        const group_str = expression.slice(0).sort().toString();
        if(!hash[group_str]){
            hash[group_str] = true;
            if(len>1){
                for(let i=0;i<len-1;i++){
                    for(let j=i+1;j<len;j++){
                        const sort_expression = expression.slice(0);
                        const exp1 = sort_expression.splice(j,1)[0];
                        const exp2 = sort_expression.splice(i,1)[0];
                        for(let n=0;n<4;n++){
                            const new_expression = sort_expression.slice(0);
                            new_expression.splice(0,0,n>1||len==2?exp1+operator[n]+exp2:'('+exp1+operator[n]+exp2+')');
                            dfs(new_expression);
                            if(exp1!=exp2&&n%2){
                                new_expression.splice(0,1,n>1||len==2?exp2+operator[n]+exp1:'('+exp2+operator[n]+exp1+')');
                                dfs(new_expression);
                            }
                        }
                    }
                }
            }else if(Math.abs(eval(expression[0])-24)<1e-6){
                result.push(expression[0]);
            }
        }
    }
    dfs(expression)
    return result;
}
const ctx=useContext()
ctx.command('24点')
.action(async ({session})=>{
    const numbers=new Array(4).fill(false).map(()=>Random.int(9))
    let result=calc24(...numbers)
    await session.intercept(
        `游戏开始,请使用:${numbers.join()}与运算符拼出一个可以得到24的算式\n如果无解，请输入'无解'\n如想退出，请输入'结束游戏'`,
        (session)=>{
            if(/[0-9+\-*\/()]+/.test(session.elements.join(''))) session.reply('答案不对哦，再试试')
        },
        (session)=>{
            if(session.elements.join()==='无解' && result.length===0){
                session.reply('确实无解')
                return true
            }
            if(session.elements.join('')==='结束游戏'){
                session.reply('好的，马上结束')
                return true
            }
            if(result.includes(session.elements.join(''))){
                session.reply('厉害，游戏结束')
                return true
            }
        },(s)=>s.group_id===session.group_id)
})