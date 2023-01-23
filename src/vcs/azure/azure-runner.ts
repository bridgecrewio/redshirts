import { AxiosError } from 'axios';
import { Repo, VcsSourceInfo } from '../../common/types';
import {
    filterRepoList,
    getExplicitRepoList,
    getRepoListFromParams,
    isSslError,
    logError,
    LOGGER,
} from '../../common/utils';
import { VcsRunner } from '../../common/vcs-runner';
import { AzureApiManager } from './azure-api-manager';
import { AzureCommit, AzureProjectsResponse, AzureRepoResponse } from './azure-types';

export class AzureRunner extends VcsRunner {
    apiManager: AzureApiManager; // need the explicit type for some calls

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    constructor(sourceInfo: VcsSourceInfo, flags: any, apiManager: AzureApiManager) {
        super(sourceInfo, [], flags, apiManager);
        this.apiManager = apiManager;
    }

    aggregateCommitContributors(repo: Repo, commits: AzureCommit[]): void {
        LOGGER.debug(`Processing commits for repo ${repo.owner}/${repo.name}`);
        for (const commitObject of commits) {
            const { author } = commitObject;

            const newCommit = {
                username: author.name,
                email: author.email,
                commitDate: author.date,
            };

            this.addContributor(repo.owner, repo.name, newCommit);
        }
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

    async getRepoList(): Promise<Repo[]> {
        // Because ADO has org > 0 or more projects > 0 or more repos,
        // we have to inject the extra project level while reusing as much from the parent as possible
        // so basically we are copying the flow but making the same helper function calls
        // so the amount of actual duplicated logic is minimal

        // we must throw any SSL error that we encounter here - it is possible in a very
        // specific set of conditions that we will not make any API calls here:
        // if the only repo spec argument is --repos, and --include-public is set,
        // then our first API call will be actually getting commits. Otherwise, our first
        // API call will be here (getting org/project repos or getting repo visibility)

        const orgsString: string | undefined = this.flags[this.sourceInfo.orgFlagName];
        const reposList: string | undefined = this.flags.repos;
        const reposFile: string | undefined = this.flags['repo-file'];
        const skipReposList: string | undefined = this.flags['skip-repos'];
        const skipReposFile: string | undefined = this.flags['skip-repo-file'];
        const projectsList: string | undefined = this.flags.projects;
        const skipProjectsList: string | undefined = this.flags['skip-projects'];

        let repos: Repo[] = [];

        if (orgsString) {
            repos = await this.getOrgRepos(orgsString);
            LOGGER.debug(`Got repos from org(s): ${repos.map((r) => `${r.owner}/${r.name}`)}`);
        }

        const explicitProjects = getRepoListFromParams(
            this.sourceInfo.minPathLength - 1,
            this.sourceInfo.maxPathLength - 1,
            projectsList
        ).map((p) => {
            return p as AzureProjectsResponse;
        });

        if (explicitProjects.length > 0) {
            const projectRepos = await this.getProjectRepos(explicitProjects);
            LOGGER.debug(`Got repos from project(s): ${projectRepos.map((r) => `${r.owner}/${r.name}`)}`);
            repos.push(...projectRepos);
        }

        const addedRepos = getExplicitRepoList(this.sourceInfo, repos, reposList, reposFile);
        if (addedRepos.length > 0) {
            if (!this.sourceInfo.includePublic) {
                LOGGER.info(
                    `--include-public was not set - getting the visibility of all explicitly specified ${this.sourceInfo.repoTerm}s`
                );
                for (const repo of addedRepos) {
                    try {
                        await this.apiManager.enrichRepo(repo);
                    } catch (error) {
                        // eslint-disable-next-line max-depth
                        if (error instanceof AxiosError && isSslError(error)) {
                            throw error;
                        }

                        logError(
                            error as Error,
                            `An error occurred getting the visibility for the ${this.sourceInfo.repoTerm} ${repo.owner}/${repo.name}. It will be excluded from the list, because this will probably lead to an error later.`
                        );
                    }
                }
            }

            LOGGER.debug(`Added repos from --repo list: ${addedRepos.map((r) => `${r.owner}/${r.name}`)}`);
            repos.push(...addedRepos);
        }

        const skipProjects = getRepoListFromParams(
            this.sourceInfo.minPathLength - 1,
            this.sourceInfo.maxPathLength - 1,
            skipProjectsList
        ).map((p) => {
            return p as AzureProjectsResponse;
        });
        repos = filterRepoList(
            repos,
            skipProjects,
            'project',
            (repo, project) => repo.owner === `${project.owner}/${project.name}`
        );

        const skipRepos = getRepoListFromParams(
            this.sourceInfo.minPathLength,
            this.sourceInfo.maxPathLength,
            skipReposList,
            skipReposFile
        );
        repos = filterRepoList(repos, skipRepos, this.sourceInfo.repoTerm);

        // now that we have all the repos and their visibility, we can remove the public ones if needed
        if (!this.sourceInfo.includePublic) {
            repos = repos.filter((repo) => {
                if (repo.private === undefined) {
                    LOGGER.info(
                        `Found ${this.sourceInfo.repoTerm} with unknown visibility: ${repo.owner}/${repo.name} - did it error out above? It will be skipped.`
                    );
                    return false;
                } else if (repo.private) {
                    return true;
                } else {
                    LOGGER.info(`Skipping public ${this.sourceInfo.repoTerm}: ${repo.owner}/${repo.name}`);
                    return false;
                }
            });
        }

        LOGGER.debug(`Final repo list: ${repos.map((r) => `${r.owner}/${r.name}`)}`);

        return repos;
    }

    async getProjectRepos(projects: AzureProjectsResponse[]): Promise<Repo[]> {
        const projectRepos: Repo[] = [];
        LOGGER.info(`Getting repos for ${projects.length} projects`);

        for (const project of projects) {
            try {
                const reposForProject = await this.apiManager.getProjectRepos(project);
                LOGGER.debug(`Found ${reposForProject.length} repos`);
                projectRepos.push(...this.convertRepos(reposForProject));
            } catch (error) {
                if (error instanceof AxiosError) {
                    if (isSslError(error)) {
                        throw error;
                    }

                    LOGGER.error(`Error getting repos for the project ${project}: ${error.message}`);
                } else {
                    LOGGER.error(`Error getting repos for the project ${project}:`);
                    LOGGER.error(error);
                }
            }
        }

        LOGGER.info(`Found ${projectRepos.length} total repos for the specified projects`);
        return projectRepos;
    }
}
