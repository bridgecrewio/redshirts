import { Flags } from '@oclif/core';
import { vcsServerFlags } from '../common/flags';
import { HelpGroup, SourceType, VcsSourceInfo } from '../common/types';
import { deleteFlagKey, getServerUrl, init } from '../common/utils';
import { BitbucketServerApiManager } from '../vcs/bitbucketServer/bitbucket-server-api-manager';
import { BitbucketServerRunner } from '../vcs/bitbucketServer/bitbucket-server-runner';
import Bitbucket from './bitbucket';

export default class BitbucketServer extends Bitbucket {
    static summary = 'Count active contributors for Bitbucket server (self-hosted) repos'

    static description = `This tool works with Bitbucket server v1 APIs.
    
    About rate limiting: Bitbucket server rate limiting is unique in that you specify a "token bucket size" and "refill rate". To translate this to requests per hour, you must calculate how many requests a client can submit in an hour without being limited. This is basically equal to the refill rate, which is the number of requests per second we can submit indefinitely without being limited. The requests per hour is then the refill rate * 3600.
    See https://confluence.atlassian.com/bitbucketserver/improving-instance-stability-with-rate-limiting-976171954.html for more information.`

    static examples = [
        `$ <%= config.bin %> <%= command.id %> --token ATXXX --repos bridgecrewio/checkov,try-bridgecrew/terragoat --hostname github.mycompany.internal`,
        `$ <%= config.bin %> <%= command.id %> --token ATXXX --workspaces bridgecrewio,try-bridgecrew --hostname github.mycompany.internal --port 9999`,
    ]

    // we can reuse most of the Bitbucket args, but `workspaces` is not relevant, so we can do this fun thing
    static flags = {
        ...vcsServerFlags,
        projects: Flags.string({
            description: 'A comma separated list of projects and / or usernames for which to fetch repos. Use the --repos option to add additional specific repos on top of those in the specified project(s). Use the --skip-repos option to exclude individual repos that are a part of these project(s). For users, use the value you would use in the git clone URL: `~username`.',
            required: false,
            helpGroup: HelpGroup.REPO_SPEC
        }),
        ...deleteFlagKey(Bitbucket.flags, 'workspaces')
    } as any;

    async run(): Promise<void> {
        
        const { flags } = await this.parse(BitbucketServer);
        init(flags);

        const serverUrl = getServerUrl(flags.hostname, flags.port, flags.protocol);
        const baseUrl = `${serverUrl}/rest/api/1.0`;
        const sourceInfo = BitbucketServer.getSourceInfo(`${flags.username}:${flags.token}`, flags['include-public'], baseUrl);

        const apiManager = new BitbucketServerApiManager(sourceInfo, flags['ca-cert']);
        const runner = new BitbucketServerRunner(sourceInfo, flags, apiManager);

        await runner.execute();
    }

    static getSourceInfo(token: string, includePublic: boolean, url: string, sourceType = SourceType.BitbucketServer): VcsSourceInfo {
        return {
            sourceType,
            url,
            token,
            repoTerm: 'repo',
            orgTerm: 'project',
            orgFlagName: 'projects',
            minPathLength: 2,
            maxPathLength: 2,
            includePublic,
            requiresEnrichment: false
        };
    }
}
