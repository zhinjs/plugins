import {DataService} from "@zhinjs/plugin-console";
import {Bot} from "zhin";
declare module '@zhinjs/plugin-console'{
    namespace Console{
        interface Services{
            plugin:PluginService
        }
    }
}
export class PluginService extends DataService<PluginService.Config>{
    constructor(public plugin:Plugin,bot:Bot,private config:PluginService.Config={}) {
        super(bot,'plugin');
    }
}
export namespace PluginService{
    export interface Config{}
}