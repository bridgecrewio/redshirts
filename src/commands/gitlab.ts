import { Command, Flags } from '@oclif/core';
import { commonFlags } from '../common/flags';
import { HelpGroup, SourceInfo, SourceType, } from '../common/types';
import { GitlabApiManager } from '../vcs/gitlab/gitlab-api-manager';
import { GitlabRunner } from '../vcs/gitlab/gitlab-runner';

export default class Gitlab extends Command {
    static description = 'Count active contributors for GitLab repos'

    static examples = [
        `$ <%= config.bin %> <%= command.id %> --token glpat_xxxx --repos bridgecrewio/checkov,group/subgroup/terragoat`,
        `$ <%= config.bin %> <%= command.id %> --token glpat_xxxx --groups bridgecrewio,try-bridgecrew,group/subgroup`,
    ]

    static flags = {
        token: Flags.string({
            char: 't',
            description: 'Gitlab personal access token. This token must be tied to a user that has sufficient visibility of the repo(s) being counted.',
            required: true,
            helpGroup: HelpGroup.AUTH
        }),
        groups: Flags.string({
            description: 'Group names and / or usernames for which to fetch repos. These values must be the namespace slug, as it appears in GitLab URLs, not the display name, which might be different. For groups, includes all subgroups. For users, this will only include repos owned by that user. Use the --repos option to add additional specific repos on top of those in the specified group(s). Use the --skip-repos option to exclude individual repos that are a part of these group(s).',
            required: false,
            helpGroup: HelpGroup.REPO_SPEC
        }),
        ...commonFlags,
    }

    async run(): Promise<void> {
        const { flags } = await this.parse(Gitlab);

        const sourceInfo = this.getSourceInfo(flags.token);

        const apiManager = new GitlabApiManager(sourceInfo, flags['ca-cert']);
        const runner = new GitlabRunner(sourceInfo, flags, apiManager);

        await runner.execute();
    }

    getSourceInfo(token: string, baseUrl = 'https://gitlab.com/api/v4', sourceType = SourceType.Github): SourceInfo {
        return {
            sourceType: sourceType,
            url: baseUrl,
            token: token,
            repoTerm: 'project',
            orgTerm: 'group',
            orgFlagName: 'groups',
            minPathLength: 2,
            maxPathLength: 99
        };
    }
}
