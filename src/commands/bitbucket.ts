import { Command, Flags } from '@oclif/core';
import { getThrottlingFlag, vcsFlags } from '../common/flags';
import { HelpGroup, SourceType, VcsSourceInfo } from '../common/types';
import { init } from '../common/utils';
import { BitbucketApiManager } from '../vcs/bitbucket/bitbucket-api-manager';
import { BitbucketRunner } from '../vcs/bitbucket/bitbucket-runner';

export default class Bitbucket extends Command {
    static summary = 'Count active contributors for Bitbucket repos';

    static description = `About authentication: this tool uses an app password with the following scopes:

    - Repositories: read
    - Account: read (not required if you always use --repos and / or --workspaces)

    See: https://support.atlassian.com/bitbucket-cloud/docs/app-passwords/
    
    About rate limiting: Bitbucket uses an hourly rate limit that rolls over every minute. Thus, this tool will attempt to submit requests in as much of a burst as possible while respecting the rolling limit. If you run this tool multiple times in quick succession, or if there are other external consumers of this rate limit, you may need to provide a lower value here, because there is no way to check the rate liit status in a stateless way. For Bitbucket, you can also control throttling by setting the MAX_REQUESTS_PER_SECOND environment variable. This will cause the tool to submit no more than that many requests per second from the start of execution. This will slow down execution but avoid unexpected rate limit issues.`;

    static examples = [
        `$ <%= config.bin %> <%= command.id %> --username my_username --token ATBBXXX --repos bridgecrewio/checkov,try-bridgecrew/terragoat`,
        `$ <%= config.bin %> <%= command.id %> --username my_username --token ATBBXXX --workspaces bridgecrewio,try-bridgecrew`,
    ];

    static flags = {
        username: Flags.string({
            description: 'Your Bitbucket username associated with the provided app token',
            char: 'u',
            required: true,
            helpGroup: HelpGroup.AUTH,
        }),
        token: Flags.string({
            char: 't',
            description:
                'A Bitbucket access token tied to the provided username. Can also be supplied with the REDSHIRTS_TOKEN environment variable. This token must be tied to a user that has sufficient visibility of the repo(s) being counted. See the description below for how to create this token.',
            required: true,
            env: 'REDSHIRTS_TOKEN',
            helpGroup: HelpGroup.AUTH,
        }),
        workspaces: Flags.string({
            description:
                'A comma separated list of workspace and / or usernames for which to fetch repos. Use the --repos option to add additional specific repos on top of those in the specified workspace(s). Use the --skip-repos option to exclude individual repos that are a part of these workspace(s).',
            required: false,
            helpGroup: HelpGroup.REPO_SPEC,
        }),
        ...vcsFlags,
        ...getThrottlingFlag(1000),
    };

    async run(): Promise<void> {
        const { flags } = await this.parse(Bitbucket);
        init(flags, this.config);

        const sourceInfo = Bitbucket.getSourceInfo(`${flags.username}:${flags.token}`, flags['include-public']);

        const apiManager = new BitbucketApiManager(sourceInfo, flags['requests-per-hour'], flags['ca-cert']);
        const runner = new BitbucketRunner(sourceInfo, flags, apiManager);

        await runner.execute();
    }

    static getSourceInfo(
        token: string,
        includePublic: boolean,
        url = 'https://api.bitbucket.org/2.0',
        sourceType = SourceType.Bitbucket
    ): VcsSourceInfo {
        return {
            sourceType,
            url,
            token,
            repoTerm: 'repo',
            orgTerm: 'workspace',
            orgFlagName: 'workspaces',
            minPathLength: 2,
            maxPathLength: 2,
            includePublic,
            requiresEnrichment: true,
        };
    }
}
