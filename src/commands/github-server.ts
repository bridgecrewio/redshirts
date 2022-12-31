import { Flags } from '@oclif/core';
import { HelpGroup, Protocol, SourceType } from '../common/types';
import { getServerUrl } from '../common/utils';
import { GithubServerRunner } from '../vcs/githubServer/github-server-runner';
import { GithubServerApiManager } from '../vcs/githubServer/github-server-api-manager';
import Github from './github';

export default class GithubServer extends Github {
    static summary = 'Count active contributors for GitHub server (self-hosted) repos'

    static description = 'This tool works with GitHub enterprise server v3 APIs. Note that earlier versions are out of support from GitHub, and thus are not supported here.'

    static examples = [
        `$ <%= config.bin %> <%= command.id %> --token ghp_xxxx --repos bridgecrewio/checkov,try-bridgecrew/terragoat --hostname github.mycompany.internal`,
        `$ <%= config.bin %> <%= command.id %> --token ghp_xxxx --orgs bridgecrewio,try-bridgecrew --hostname github.mycompany.internal --port 9999`,
    ]

    static flags = {
        hostname: Flags.string({
            description: 'The hostname of your GitHub server, e.g. `github.mycompany.com`. Do not include the port and protocol here (see --port and --protocol).',
            char: 'h',
            required: true,
            helpGroup: HelpGroup.CONNECTION
        }),
        port: Flags.integer({
            description: 'The port of your GitHub server, if not a standard port (443 for https, or 80 for http).',
            char: 'p',
            required: false,
            helpGroup: HelpGroup.CONNECTION
        }),
        protocol: Flags.enum({
            description: 'Protocol for your server, https (default) or http. Affects the default port value if you do not specify a port.',
            options: Object.values(Protocol),
            required: false,
            default: Protocol.HTTPS,
            helpGroup: HelpGroup.CONNECTION
        }),
        ...Github.flags
    }

    async run(): Promise<void> {
        
        const { flags } = await this.parse(GithubServer);

        const serverUrl = getServerUrl(flags.hostname, flags.port, flags.protocol);
        const baseUrl = `${serverUrl}/api/v3`;
        const sourceInfo = this.getSourceInfo(flags.token, baseUrl, SourceType.GithubServer);

        const apiManager = new GithubServerApiManager(sourceInfo, flags['ca-cert']);
        const runner = new GithubServerRunner(sourceInfo, flags, apiManager);

        await runner.execute();
    }
}
