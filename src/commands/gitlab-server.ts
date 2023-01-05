import { Flags } from '@oclif/core';
import { HelpGroup, Protocol, SourceType } from '../common/types';
import { getServerUrl } from '../common/utils';
import { GitlabServerApiManager } from '../vcs/gitlabServer/gitlab-server-api-manager';
import { GitlabServerRunner } from '../vcs/gitlabServer/gitlab-server-runner';
import Gitlab from './gitlab';

export default class GitlabServer extends Gitlab {
    static summary = 'Count active contributors for GitLab server (self-hosted) repos'

    static description = 'This tool works with GitLab enterprise server v4 APIs, supported by server versions 13.x and higher. Note that earlier versions are out of support from GitLab, and thus are not supported here.'

    static examples = [
        `$ <%= config.bin %> <%= command.id %> --token ghp_xxxx --repos bridgecrewio/checkov,try-bridgecrew/terragoat --hostname gitlab.mycompany.internal`,
        `$ <%= config.bin %> <%= command.id %> --token ghp_xxxx --groups bridgecrewio,try-bridgecrew,group/subgroup --hostname gitlab.mycompany.internal --port 9999`,
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
        ...Gitlab.flags,
    }

    async run(): Promise<void> {
        
        const { flags } = await this.parse(GitlabServer);

        const serverUrl = getServerUrl(flags.hostname, flags.port, flags.protocol);
        const baseUrl = `${serverUrl}/api/v4`;
        const sourceInfo = Gitlab.getSourceInfo(flags.token, flags['include-public'], baseUrl, SourceType.GitlabServer);

        const apiManager = new GitlabServerApiManager(sourceInfo, flags['ca-cert']);
        const runner = new GitlabServerRunner(sourceInfo, flags, apiManager);

        await runner.execute();
    }
}
