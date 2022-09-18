import {Awaitable, Bot} from 'zhin'
import {Console} from './index'

export namespace DataService {
    export interface Options {
        authority?: number
    }
}

export abstract class DataService<T = never> {
    public get(forced?: boolean): Awaitable<T> {
        return null
    }

    constructor(public bot: Bot, protected key: keyof Console.Services, public options: DataService.Options = {}) {
    }

    start() {
        this.refresh()
    }

    protected broadcast(type: string, value: any) {
        this.bot.console?.ws.broadcast(type, { key: this.key, value }, this.options)
    }

    async refresh() {
        this.broadcast('data', await this.get(true))
    }

    patch(value: T) {
        this.broadcast('patch', value)
    }
}
