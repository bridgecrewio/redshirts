import { AxiosError } from 'axios';
import { BaseRunner } from './base-runner';
import { Repo, VcsSourceInfo } from './types';
import { filterRepoList, getExplicitRepoList, getRepoListFromParams, LOGGER, stringToArr } from './utils';
import { VcsApiManager } from './vcs-api-manager';

// TODO
// - get commits from all branches for all VCSes and git log
// - default to private only repos - should we explicitly check each repo for its visibility?
// - document specific permissions needed
// - public / private repos - include in output?
// - document getting a cert chain
// - some sort of errored repo list that is easy to review
// - author vs committer
// - rate limiting

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
            LOGGER.debug(`Got repos from org(s): ${repos.map(r => `${r.owner}/${r.name}`)}`);
        }

        const addedRepos = getExplicitRepoList(this.sourceInfo, repos, reposList, reposFile);

        if (addedRepos.length > 0) {
            LOGGER.debug(`Added repos from --repo list: ${addedRepos.map(r => `${r.owner}/${r.name}`)}`);
            repos.push(...addedRepos);
        }

        if (repos.length === 0) {
            LOGGER.debug('No explicitly specified repos - getting all user repos');
            repos = await this.getUserRepos();
        }

        const skipRepos = getRepoListFromParams(this.sourceInfo.minPathLength, this.sourceInfo.maxPathLength, skipReposList, skipReposFile);

        repos = filterRepoList(repos, skipRepos, this.sourceInfo.repoTerm);

        return repos;
    }

    async getOrgRepos(orgsString: string): Promise<Repo[]> {
        const repos: Repo[] = [];
        const orgs = stringToArr(orgsString);
        for (const org of orgs) {
            LOGGER.debug(`Getting ${this.sourceInfo.repoTerm}s for ${this.sourceInfo.orgTerm} ${org}`);
            try {
                // eslint-disable-next-line no-await-in-loop
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
