import { Command, Flags } from '@oclif/core';
import { CLIError } from '@oclif/errors';
import { vcsFlags } from '../common/flags';
import { HelpGroup, SourceType, VcsSourceInfo } from '../common/types';
import { init } from '../common/utils';
import { AzureApiManager } from '../vcs/azure/azure-api-manager';
import { AzureRunner } from '../vcs/azure/azure-runner';

export default class AzureDevOps extends Command {

    static summary = 'Count active contributors for Azure DevOps repos'

    static description = `Note: you must provide --repos, --projects, and / or --orgs. Due to limitations in Azure DevOps APIs, it is not possible to use a personal access token to fetch all orgs and repos for a user.
    
    About authentication: you must use a personal access token, scoped to the appropriate organization(s), with the Code: Read scope. The token's user must have at least a Basic level of membership to the organizations being scanned. Note that this is higher than the default access level that may be provided when you add a user to a team. See: https://learn.microsoft.com/en-us/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate?view=azure-devops&tabs=Windows and https://learn.microsoft.com/en-us/azure/devops/organizations/accounts/add-organization-users?view=azure-devops&tabs=browser

    About rate limiting: For Azure DevOps, this tool will attempt to submit requests in a burst until a rate limit is hit, and then respect the rate limit reset information provided in the response. Azure DevOps does not consistently provide rate limit headers in the responses, and thus it is not possible to always avoid hitting a rate limit.`

    static examples = [
        `$ <%= config.bin %> <%= command.id %> --token obnwxxx --repos org/project/repo,org/project/repo2,org/project2/repo`,
        `$ <%= config.bin %> <%= command.id %> --token obnwxxx --orgs bridgecrewio,try-bridgecrew`,
        `$ <%= config.bin %> <%= command.id %> --token obnwxxx --orgs bridgecrewio,try-bridgecrew --projects org/project`,
    ]

    static flags = {
        token: Flags.string({
            char: 't',
            description: 'An Azure DevOps user personal access token tied to the provided username. This token must be tied to a user that has sufficient visibility of the repo(s) being counted.',
            required: true,
            helpGroup: HelpGroup.AUTH
        }),
        orgs: Flags.string({
            description: 'Org names for which to fetch repos. Use the --repos and / or --projects options to add additional specific repos on top of those in the specified org(s). Use the --skip-repos and / or --skip-projects options to exclude individual repos or projects that are a part of these org(s).',
            required: false,
            helpGroup: HelpGroup.REPO_SPEC
        }),
        projects: Flags.string({
            description: 'Project names for which to fetch repos. Use the --repos option to add additional specific repos on top of those in the specified project(s). Use the --skip-repos option to exclude individual repos that are a part of these project(s).',
            required: false,
            helpGroup: HelpGroup.REPO_SPEC
        }),
        'skip-projects': Flags.string({
            description: 'Project names for which to skip fetching repos. Use this option to skip projects that are part of the specified orgs. If the same project is included in both --projects and --skip-projects, it is skipped. If a repo from a skipped project is included in --repos, it is also still skipped.',
            required: false,
            helpGroup: HelpGroup.REPO_SPEC
        }),
        ...vcsFlags,
    }

    async run(): Promise<void> {
        const { flags } = (await this.parse(AzureDevOps));
        init(flags);

        const sourceInfo = AzureDevOps.getSourceInfo(':' + flags.token, flags['include-public']);

        const apiManager = new AzureApiManager(sourceInfo, flags['ca-cert']);
        const runner = new AzureRunner(sourceInfo, flags, apiManager);

        if (!(flags.orgs || flags.projects || flags.repos || flags['repo-file'])) {
            throw new CLIError('At least one of --orgs, --projects, --repos, or --repo-file is required for Azure DevOps');
        }

        await runner.execute();
    }

    static getSourceInfo(token: string, includePublic: boolean, url = 'https://dev.azure.com', sourceType = SourceType.AzureRepos): VcsSourceInfo {
        return {
            sourceType,
            url,
            token,
            repoTerm: 'repo',
            orgTerm: 'organization',
            orgFlagName: 'orgs',
            minPathLength: 3,
            maxPathLength: 3,
            includePublic,
            requiresEnrichment: false
        };
    }
}
