import { Flags } from '@oclif/core';
import { CLIError } from '@oclif/errors';
import { commonFlags } from '../common/flags';
import { RedshirtsCommand } from '../common/redshirts-command';
import { HelpGroup, Repo, SourceInfo } from '../common/types';
import { AzureApiManager } from '../vcs/azure/azure-api-manager';
import { AzureCounter } from '../vcs/azure/azure-counter';
import { AzureProjectsResponse, AzureRepoResponse } from '../vcs/azure/azure-types';

// TODO access notes:
// user must be at least "basic" in the ADO org (which is higher than you get by default if you add a user to a team)

export default class AzureDevOps extends RedshirtsCommand {
    static description = 'Count active contributors for Azure DevOps repos. Note: you must provide --repos, --projects, and / or --orgs. Due to limitations in Azure DevOps APIs, it is not possible to use a personal access token to fetch all orgs and repos for a user.'

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
        ...commonFlags,
    }

    async run(): Promise<void> {
        const { flags } = (await this.parse(AzureDevOps));

        const sourceInfo = {
            url: 'https://dev.azure.com',
            token: ':' + flags.token,
            repoTerm: 'repo',
            orgTerm: 'organization',
            orgFlagName: 'orgs',
            minPathLength: 3,
            maxPathLength: 3
        };

        const apiManager = new AzureApiManager(sourceInfo, flags['ca-cert']);
        const counter = new AzureCounter();

        if (!(flags.orgs || flags.projects || flags.repos || flags['repo-file'])) {
            throw new CLIError('At least one of --orgs, --projects, --repos, or --repo-file is required for Azure DevOps');
        }

        await this.execute(flags, sourceInfo, apiManager, counter);
    }

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    async getRepoList(sourceInfo: SourceInfo, apiManager: AzureApiManager, flags: any): Promise<Repo[]> {
        // Because ADO has org > 0 or more projects > 0 or more repos,
        // we have to inject the extra project level while reusing as much from the parent as possible
        // so basically we are copying the flow but making the same helper function calls
        // so the amount of actual duplicated logic is minimal
        
        const orgsString: string | undefined = flags[sourceInfo.orgFlagName];
        const reposList: string | undefined = flags.repos;
        const reposFile: string | undefined = flags['repo-file'];
        const skipReposList: string | undefined = flags['skip-repos'];
        const skipReposFile: string | undefined = flags['skip-repo-file'];
        const projectsList: string | undefined = flags.projects;
        const skipProjectsList: string | undefined = flags['skip-projects'];

        let repos: Repo[] = [];

        if (orgsString) {
            repos = await this.getOrgRepos(sourceInfo, orgsString, apiManager);
            console.debug(`Got repos from org(s): ${repos.map(r => `${r.owner}/${r.name}`)}`);
        }

        const explicitProjects = this.getRepoListFromParams(sourceInfo.minPathLength - 1, sourceInfo.maxPathLength - 1, projectsList).map(p => {
            return p as AzureProjectsResponse;
        });

        const projectRepos: Repo[] = [];
        for (const project of explicitProjects) {
            // eslint-disable-next-line no-await-in-loop
            projectRepos.push(...this.convertRepos(await apiManager.getProjectRepos(project)));
        }
        
        if (explicitProjects.length > 0) {
            console.debug(`Got repos from project(s): ${projectRepos.map(r => `${r.owner}/${r.name}`)}`);
            repos.push(...projectRepos);
        }

        const addedRepos = this.getExplicitRepoList(sourceInfo, repos, reposList, reposFile);
        if (addedRepos.length > 0) {
            console.debug(`Added repos from --repo list: ${addedRepos.map(r => `${r.owner}/${r.name}`)}`);
            repos.push(...addedRepos);
        }

        const skipProjects = this.getRepoListFromParams(sourceInfo.minPathLength - 1, sourceInfo.maxPathLength - 1, skipProjectsList).map(p => {
            return p as AzureProjectsResponse;
        });
        repos = this.filterRepoList(repos, skipProjects, 'project', (repo, project) => repo.owner === `${project.owner}/${project.name}`);

        const skipRepos = this.getRepoListFromParams(sourceInfo.minPathLength, sourceInfo.maxPathLength, skipReposList, skipReposFile);
        repos = this.filterRepoList(repos, skipRepos, sourceInfo.repoTerm);

        console.debug(`Final repo list: ${repos.map(r => `${r.owner}/${r.name}`)}`);

        return repos;
    }

    convertRepos(reposResponse: AzureRepoResponse[]): Repo[] {
        const filteredRepos: Repo[] = [];
        for (const repo of reposResponse) {
            filteredRepos.push({
                name: repo.name,
                owner: repo.owner,
                private: repo.project.visibility === 'private',
            });
        }

        return filteredRepos;
    }
}
