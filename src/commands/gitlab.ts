import { Command, Flags } from '@oclif/core';
import { vcsFlags } from '../common/flags';
import { HelpGroup, SourceType, VcsSourceInfo } from '../common/types';
import { init } from '../common/utils';
import { GitlabApiManager } from '../vcs/gitlab/gitlab-api-manager';
import { GitlabRunner } from '../vcs/gitlab/gitlab-runner';

export default class Gitlab extends Command {
    static summary = 'Count active contributors for GitLab repos';

    static description = `About authentication: you must create a personal access token with the read_api scope. See https://docs.gitlab.com/ee/user/profile/personal_access_tokens.html
    
    About rate limiting: For GitLab, this tool will attempt to submit requests in a burst until a rate limit is hit, and then respect the rate limit reset information provided in the response. GitLab does not consistently provide rate limit headers in the responses, and thus it is not possible to always avoid hitting a rate limit.`;

    static examples = [
        `$ <%= config.bin %> <%= command.id %> --token glpat_xxxx --repos bridgecrewio/checkov,group/subgroup/terragoat`,
        `$ <%= config.bin %> <%= command.id %> --token glpat_xxxx --groups bridgecrewio,try-bridgecrew,group/subgroup`,
    ];

    static flags = {
        token: Flags.string({
            char: 't',
            description:
                'Gitlab personal access token. This token must be tied to a user that has sufficient visibility of the repo(s) being counted.',
            required: true,
            helpGroup: HelpGroup.AUTH,
        }),
        groups: Flags.string({
            description:
                'Group names and / or usernames for which to fetch repos. These values must be the namespace slug, as it appears in GitLab URLs, not the display name, which might be different. For groups, includes all subgroups. For users, this will only include repos owned by that user. Use the --repos option to add additional specific repos on top of those in the specified group(s). Use the --skip-repos option to exclude individual repos that are a part of these group(s).',
            required: false,
            helpGroup: HelpGroup.REPO_SPEC,
        }),
        ...vcsFlags,
    };

    async run(): Promise<void> {
        const { flags } = await this.parse(Gitlab);
        init(flags);

        const sourceInfo = Gitlab.getSourceInfo(flags.token, flags['include-public']);

        const apiManager = new GitlabApiManager(sourceInfo, flags['ca-cert']);
        const runner = new GitlabRunner(sourceInfo, flags, apiManager);

        await runner.execute();
    }

    static getSourceInfo(
        token: string,
        includePublic: boolean,
        url = 'https://gitlab.com/api/v4',
        sourceType = SourceType.Gitlab
    ): VcsSourceInfo {
        return {
            sourceType,
            url,
            token,
            repoTerm: 'project',
            orgTerm: 'group',
            orgFlagName: 'groups',
            minPathLength: 2,
            maxPathLength: 99,
            includePublic,
            requiresEnrichment: false,
        };
    }
}
