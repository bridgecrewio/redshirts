import { AxiosError } from 'axios';
import { BaseRunner } from './base-runner';
import { Repo, VcsSourceInfo } from './types';
import { filterRepoList, getExplicitRepoList, getRepoListFromParams, logError, LOGGER, stringToArr } from './utils';
import { VcsApiManager } from './vcs-api-manager';

export abstract class VcsRunner extends BaseRunner {
    sourceInfo: VcsSourceInfo;
    apiManager: VcsApiManager;

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    constructor(sourceInfo: VcsSourceInfo, excludedEmailRegexes: Array<string>, flags: any, apiManager: VcsApiManager) {
        super(sourceInfo, excludedEmailRegexes, flags, apiManager);
        this.sourceInfo = sourceInfo;
        this.apiManager = apiManager;
    }

    async getRepoList(): Promise<Repo[]> {

        const orgsString: string | undefined = this.flags[this.sourceInfo.orgFlagName];
        const reposList: string | undefined = this.flags.repos;
        const reposFile: string | undefined = this.flags['repo-file'];
        const skipReposList: string | undefined = this.flags['skip-repos'];
        const skipReposFile: string | undefined = this.flags['skip-repo-file'];

        let repos: Repo[] = [];

        if (orgsString) {
            repos = await this.getOrgRepos(orgsString);
            LOGGER.debug(`Got repos from ${this.sourceInfo.orgTerm}(s): ${repos.map(r => `${r.owner}/${r.name}`)}`);
        }

        const addedRepos = getExplicitRepoList(this.sourceInfo, repos, reposList, reposFile);

        if (addedRepos.length > 0) {
            if (!this.sourceInfo.includePublic || this.sourceInfo.requiresEnrichment) {
                LOGGER.debug(`Enriching specified ${this.sourceInfo.repoTerm}s with visibility and default branch info`);
                for (const repo of addedRepos) {
                    try {
                        await this.apiManager.enrichRepo(repo);
                    } catch (error) {
                        logError(error as Error, `An error occurred getting the visibility for the ${this.sourceInfo.repoTerm} ${repo.owner}/${repo.name}. It will be excluded from the list, because this will probably lead to an error later.`);
                    }
                }
            }

            LOGGER.debug(`Added repos from --repo list: ${addedRepos.map(r => `${r.owner}/${r.name}`)}`);
            repos.push(...addedRepos);
        }

        if (repos.length === 0) {
            LOGGER.debug('No explicitly specified repos - getting all user repos');
            repos = await this.getUserRepos();
        }

        const skipRepos = getRepoListFromParams(this.sourceInfo.minPathLength, this.sourceInfo.maxPathLength, skipReposList, skipReposFile);

        repos = filterRepoList(repos, skipRepos, this.sourceInfo.repoTerm);

        // now that we have all the repos and their visibility, we can remove the public ones if needed
        if (!this.sourceInfo.includePublic) {
            repos = repos.filter(repo => {
                if (repo.private === undefined) {
                    LOGGER.debug(`Found ${this.sourceInfo.repoTerm} with unknown visibility: ${repo.owner}/${repo.name} - did it error out above? It will be skipped.`);
                    return false;
                } else if (repo.private) {
                    return true;
                } else {
                    LOGGER.debug(`Skipping public ${this.sourceInfo.repoTerm}: ${repo.owner}/${repo.name}`);
                    return false;
                }
            });
        }

        return repos;
    }

    async getOrgRepos(orgsString: string): Promise<Repo[]> {
        const repos: Repo[] = [];
        const orgs = stringToArr(orgsString);
        for (const org of orgs) {
            LOGGER.debug(`Getting ${this.sourceInfo.repoTerm}s for ${this.sourceInfo.orgTerm} ${org}`);
            try {
                const orgRepos = (await this.apiManager.getOrgRepos(org));
                repos.push(...this.convertRepos(orgRepos));
            } catch (error) {
                if (error instanceof AxiosError) {
                    LOGGER.error(`Error getting ${this.sourceInfo.repoTerm}s for the ${this.sourceInfo.orgTerm} ${org}: ${error.message}`);
                } else {
                    LOGGER.error(`Error getting ${this.sourceInfo.repoTerm}s for the ${this.sourceInfo.orgTerm} ${org}:`);
                    LOGGER.error(error);
                }
            }
        }

        LOGGER.debug(`Found ${repos.length} ${this.sourceInfo.repoTerm}s for the specified ${this.sourceInfo.orgTerm}s`);
        return repos;
    }

    async getUserRepos(): Promise<Repo[]> {
        const userRepos = await this.apiManager.getUserRepos();
        LOGGER.debug(`Found ${userRepos.length} repos for the user`);
        const repos = this.convertRepos(userRepos);
        return repos;
    }
}
