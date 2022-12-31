import { Flags } from '@oclif/core';
import { HelpGroup, Protocol, SourceType, VcsSourceInfo } from '../common/types';
import { deleteFlagKey, getServerUrl } from '../common/utils';
import { BitbucketServerApiManager } from '../vcs/bitbucketServer/bitbucket-server-api-manager';
import { BitbucketServerRunner } from '../vcs/bitbucketServer/bitbucket-server-runner';
import Bitbucket from './bitbucket';

export default class BitbucketServer extends Bitbucket {
    static summary = 'Count active contributors for Bitbucket server (self-hosted) repos'

    // static description = 'This tool works with Bitbucket server v1 APIs. Note that earlier versions are out of support from GitHub, and thus are not supported here.'

    static examples = [
        `$ <%= config.bin %> <%= command.id %> --token ATXXX --repos bridgecrewio/checkov,try-bridgecrew/terragoat --hostname github.mycompany.internal`,
        `$ <%= config.bin %> <%= command.id %> --token ATXXX --workspaces bridgecrewio,try-bridgecrew --hostname github.mycompany.internal --port 9999`,
    ]

    // we can reuse most of the Bitbucket args, but `workspaces` is not relevant, so we can do this fun thing
    static flags = {
        hostname: Flags.string({
            description: 'The hostname of your Bitbucket server, e.g. `github.mycompany.com`. Do not include the port and protocol here (see --port and --protocol).',
            char: 'h',
            required: true,
            helpGroup: HelpGroup.CONNECTION
        }),
        port: Flags.integer({
            description: 'The port of your Bitbucket server, if not a standard port (443 for https, or 80 for http).',
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
        projects: Flags.string({
            description: 'A comma separated list of projects and / or usernames for which to fetch repos. Use the --repos option to add additional specific repos on top of those in the specified project(s). Use the --skip-repos option to exclude individual repos that are a part of these project(s). For users, use the value you would use in the git clone URL: `~username`.',
            required: false,
            helpGroup: HelpGroup.REPO_SPEC
        }),
        ...deleteFlagKey(Bitbucket.flags, 'workspaces')
    } as any;

    async run(): Promise<void> {
        
        const { flags } = await this.parse(BitbucketServer);

        const serverUrl = getServerUrl(flags.hostname, flags.port, flags.protocol);
        const baseUrl = `${serverUrl}/rest/api/1.0`;
        const sourceInfo = this.getSourceInfo(`${flags.username}:${flags.token}`, baseUrl);

        const apiManager = new BitbucketServerApiManager(sourceInfo, flags['ca-cert']);
        const runner = new BitbucketServerRunner(sourceInfo, flags, apiManager);

        await runner.execute();
    }

    getSourceInfo(token: string, baseUrl: string, sourceType = SourceType.BitbucketServer): VcsSourceInfo {
        return {
            sourceType: sourceType,
            url: baseUrl,
            token: token,
            repoTerm: 'repo',
            orgTerm: 'project',
            orgFlagName: 'projects',
            minPathLength: 2,
            maxPathLength: 2
        };
    }
}
