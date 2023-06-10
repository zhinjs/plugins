import {useContext} from "zhin";
import '@zhinjs/plugin-database'
import {Listener} from "./models";

const ctx=useContext()
if (ctx.database) {
    ctx.database.define('Listener', Listener)
}
ctx.disposes.push(
    ctx.zhin.on('database-created', () => {
        ctx.database.define('Listener', Listener)
    }))
