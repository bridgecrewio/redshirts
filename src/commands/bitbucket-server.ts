import { Command, Flags } from '@oclif/core';
import { vcsServerFlags } from '../common/flags';
import { MAX_REQUESTS_PER_SECOND_VAR } from '../common/throttled-vcs-api-manager';
import { HelpGroup, SourceType } from '../common/types';
import { deleteFlagKey, getServerUrl, init } from '../common/utils';
import { BitbucketServerApiManager } from '../vcs/bitbucketServer/bitbucket-server-api-manager';
import { BitbucketServerRunner } from '../vcs/bitbucketServer/bitbucket-server-runner';
import Bitbucket from './bitbucket';
import { BitbucketServerVcsSourceInfo } from '../vcs/bitbucketServer/bitbucket-server-types';

// do not extend Bitbucket command, because we do not want to inherit all of the flags (workspaces is not relevant)
export default class BitbucketServer extends Command {
    static summary = 'Count active contributors for Bitbucket server (self-hosted) repos';

    static description = `This tool works with Bitbucket server v1 APIs.

    About authentication: you must create an HTTP access token with Project read and repository read permissions. See: https://confluence.atlassian.com/bitbucketserver/http-access-tokens-939515499.html
    
    About rate limiting: Bitbucket server rate limiting is unique in that you specify a "token bucket size" and "refill rate". To translate this to requests per hour, you must calculate how many requests a client can submit in an hour without being limited. This is basically equal to the refill rate, which is the number of requests per second we can submit indefinitely without being limited. The requests per hour is then the refill rate * 3600.
    See https://confluence.atlassian.com/bitbucketserver/improving-instance-stability-with-rate-limiting-976171954.html for more information.
    
    If you run this tool multiple times in quick succession, or if there are other external consumers of this rate limit, you may need to provide a lower value here, because there is no way to check the rate limit status in a stateless way. For Bitbucket Server, you can also control throttling by setting the ${MAX_REQUESTS_PER_SECOND_VAR} environment variable. This will cause the tool to submit no more than that many requests per second from the start of execution. This will slow down execution but avoid unexpected rate limit issues.`;

    static examples = [
        `$ <%= config.bin %> <%= command.id %> --username myuser --token ATXXX --repos bridgecrewio/checkov,try-bridgecrew/terragoat --hostname bitbucket.mycompany.internal`,
        `$ <%= config.bin %> <%= command.id %> --token ATXXX --projects bridgecrewio,try-bridgecrew --hostname bitbucket.mycompany.internal --port 9999`,
    ];

    // we can reuse most of the Bitbucket args, but `workspaces` is not relevant, so we can do this fun thing
    static flags = {
        ...vcsServerFlags,
        projects: Flags.string({
            description:
                'A comma separated list of projects and / or usernames for which to fetch repos. Use the --repos option to add additional specific repos on top of those in the specified project(s). Use the --skip-repos option to exclude individual repos that are a part of these project(s). For users, use the value you would use in the git clone URL: `~username`.',
            required: false,
            helpGroup: HelpGroup.REPO_SPEC,
        }),
        ...deleteFlagKey(Bitbucket.flags, 'workspaces', 'username'),
        username: Flags.string({
            description:
                'Your Bitbucket username associated with the provided app token. If provided, then Redshirts will use Basic authentication with this username and token. If omitted, then Redshirts will use Bearer auth with the provided token.',
            char: 'u',
            required: false,
            helpGroup: HelpGroup.AUTH,
        }),
    } as any;

    async run(): Promise<void> {
        const { flags } = await this.parse(BitbucketServer);
        init(flags, this.config);

        const serverUrl = getServerUrl(flags.hostname, flags.port, flags.protocol);
        const baseUrl = `${serverUrl}/rest/api/1.0`;
        const sourceInfo = BitbucketServer.getSourceInfo(flags.token, flags['include-public'], baseUrl, flags.username);

        const apiManager = new BitbucketServerApiManager(
            sourceInfo,
            flags['requests-per-hour'],
            flags['ca-cert'],
            flags['no-cert-verify']
        );
        const runner = new BitbucketServerRunner(sourceInfo, flags, apiManager);

        await runner.execute();
    }

    static getSourceInfo(
        token: string,
        includePublic: boolean,
        url: string,
        username?: string,
        sourceType = SourceType.BitbucketServer
    ): BitbucketServerVcsSourceInfo {
        return {
            sourceType,
            url,
            username,
            token,
            repoTerm: 'repo',
            orgTerm: 'project',
            orgFlagName: 'projects',
            minPathLength: 2,
            maxPathLength: 2,
            includePublic,
            requiresEnrichment: false,
        };
    }
}
