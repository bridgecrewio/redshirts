import { Command, Flags } from '@oclif/core';
import { vcsFlags } from '../common/flags';
import { HelpGroup, SourceType, VcsSourceInfo } from '../common/types';
import { init } from '../common/utils';
import { GithubApiManager } from '../vcs/github/github-api-manager';
import { GithubRunner } from '../vcs/github/github-runner';

export default class Github extends Command {
    static summary = 'Count active contributors for GitHub repos';

    static description = `About authentication: you must use one of the following options:
    
    - a GitHub "classic" personal access token (PAT) with the "repo" scope (the top-level checkbox must be checked). This type of token can be used for multiple orgs at once.
    - a fine-grained token with the following permissions for the appropriate repos: Metadata (read-only), Contents (read-only). This type of token is scoped to a single org. To use it for multiple orgs, you must use multiple tokens and run this tool for each one.
    
    See: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token
    
    Additionally, if you are a member of an organization that requires SSO, you must also authorize that token for the organization. This requires you to use a classic PAT. See https://docs.github.com/en/enterprise-cloud@latest/authentication/authenticating-with-saml-single-sign-on/authorizing-a-personal-access-token-for-use-with-saml-single-sign-on`;

    static examples = [
        `$ <%= config.bin %> <%= command.id %> --token ghp_xxxx --repos bridgecrewio/checkov,try-bridgecrew/terragoat`,
        `$ <%= config.bin %> <%= command.id %> --token ghp_xxxx --orgs bridgecrewio,try-bridgecrew`,
    ];

    static flags = {
        token: Flags.string({
            char: 't',
            description:
                'Github personal access token. This token must be tied to a user that has sufficient visibility of the repo(s) being counted. See the description below for more information.',
            required: true,
            helpGroup: HelpGroup.AUTH,
        }),
        orgs: Flags.string({
            description:
                "Organization names and / or usernames for which to fetch repos. Note: due to limitations in the GitHub APIs, specifying a username here will only result in the user's public repositories being included. Use the --repos option to add additional specific repos on top of those in the specified users / orgs (including user private repos, if authorized). Use the --skip-repos option to exclude individual repos that are a part of these users / orgs.",
            required: false,
            helpGroup: HelpGroup.REPO_SPEC,
        }),
        ...vcsFlags,
    };

    async run(): Promise<void> {
        const { flags } = await this.parse(Github);
        init(flags);

        const sourceInfo = Github.getSourceInfo(flags.token, flags['include-public']);

        const apiManager = new GithubApiManager(sourceInfo, flags['ca-cert']);
        const runner = new GithubRunner(sourceInfo, flags, apiManager);

        await runner.execute();
    }

    static getSourceInfo(
        token: string,
        includePublic: boolean,
        url = 'https://api.github.com',
        sourceType = SourceType.Github
    ): VcsSourceInfo {
        return {
            sourceType,
            url,
            token,
            repoTerm: 'repo',
            orgTerm: 'organization',
            orgFlagName: 'orgs',
            minPathLength: 2,
            maxPathLength: 2,
            includePublic,
            requiresEnrichment: false,
        };
    }
}
