import { Flags } from '@oclif/core';
import { commonFlags } from '../common/flags';
import RedshirtsVcsCommand from '../common/redshirts-command';
import { HelpGroup, SourceInfo, SourceType } from '../common/types';
import { GithubApiManager } from '../vcs/github/github-api-manager';
import { GithubRunner } from '../vcs/github/github-runner';

export default class Github extends RedshirtsVcsCommand {
    static description = 'Count active contributors for GitHub repos'

    static examples = [
        `$ <%= config.bin %> <%= command.id %> --token ghp_xxxx --repos bridgecrewio/checkov,try-bridgecrew/terragoat`,
        `$ <%= config.bin %> <%= command.id %> --token ghp_xxxx --orgs bridgecrewio,try-bridgecrew`,
    ]

    static flags = {
        token: Flags.string({
            char: 't',
            description: 'Github personal access token. This token must be tied to a user that has sufficient visibility of the repo(s) being counted.',
            required: true,
            helpGroup: HelpGroup.AUTH
        }),
        orgs: Flags.string({
            description: 'Organization names and / or usernames for which to fetch repos. Note: due to limitations in the GitHub APIs, specifying a username here will only result in the user\'s public repositories being included. Use the --repos option to add additional specific repos on top of those in the specified users / orgs (including user private repos, if authorized). Use the --skip-repos option to exclude individual repos that are a part of these users / orgs.',
            required: false,
            helpGroup: HelpGroup.REPO_SPEC
        }),
        ...commonFlags,
    }

    async run(): Promise<void> {
        const { flags } = await this.parse(Github);

        const sourceInfo = this.getSourceInfo(flags.token);

        const apiManager = new GithubApiManager(sourceInfo, flags['ca-cert']);
        const runner = new GithubRunner(sourceInfo, flags, apiManager);

        await runner.execute();
    }

    getSourceInfo(token: string, baseUrl = 'https://api.github.com', sourceType = SourceType.Github): SourceInfo {
        return {
            sourceType: sourceType,
            url: baseUrl,
            token: token,
            repoTerm: 'repo',
            orgTerm: 'organization',
            orgFlagName: 'orgs',
            minPathLength: 2,
            maxPathLength: 2
        };
    }
}
