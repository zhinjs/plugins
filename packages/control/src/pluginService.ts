import {DataService} from "@zhinjs/plugin-console";
import {Context} from "zhin";
declare module '@zhinjs/plugin-console'{
    namespace Console{
        interface Services{
            plugins:PluginService
        }
    }
}
export class PluginService extends DataService<PluginService.Config>{
    constructor(public plugin:Plugin,ctx:Context,private config:PluginService.Config={}) {
        super(ctx,'plugins');
    }
}
export namespace PluginService{
    export interface Config{}
}