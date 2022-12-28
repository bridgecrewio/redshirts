/* eslint-disable no-await-in-loop */
import { Command } from '@oclif/core';
import { AxiosError } from 'axios';
import { Commit, Repo, RepoResponse, SourceInfo } from '../common/types';
import { ApiManager } from './api-manager';
import { BaseCounter } from './base-counter';
import { printSummary } from './output';
import { DEFAULT_DAYS, readRepoFile, splitRepos, stringToArr } from './utils';

// TODO
// - get commits from all branches for all VCSes and git log
// - unique user identification per VCS
// - default to private only repos
// - document specific permissions needed

export abstract class RedshirtsCommand extends Command {

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    async execute(flags: any, sourceInfo: SourceInfo, apiManager: ApiManager, counter: BaseCounter): Promise<void> {
        if (flags.days !== DEFAULT_DAYS) {
            console.warn(`Warning: you specified a --days value of ${flags.days}, which is different from the value used in the Prisma Cloud platform (${DEFAULT_DAYS}). Your results here will differ.`);
        }

        const repos = await this.getRepoList(sourceInfo, apiManager, flags);

        await this.processRepos(sourceInfo, repos, flags.days, counter, apiManager);

        printSummary(counter, flags.output, flags.sort);
    }

    async processRepos(sourceInfo: SourceInfo, repos: Repo[], days: number, counter: BaseCounter, apiManager: ApiManager): Promise<void> {
        for (const repo of repos) {
            try {
                const commits: Commit[] = await apiManager.getCommits(repo, days);
                if (commits.length > 0) {
                    counter.aggregateCommitContributors(repo, commits);
                } else {
                    counter.addEmptyRepo(repo);
                }
            } catch (error) {
                if (error instanceof AxiosError) {
                    console.error(`Failed to get commits for ${sourceInfo.repoTerm} ${repo.owner}/${repo.name}. Reason: ${error.response?.data?.message}`);
                } else {
                    console.error(`Failed to get commits ${error}`);
                }
            }
        }
    }

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    async getRepoList(sourceInfo: SourceInfo, apiManager: ApiManager, flags: any): Promise<Repo[]> {

        const orgsString: string | undefined = flags[sourceInfo.orgFlagName];
        const reposList: string | undefined = flags.repos;
        const reposFile: string | undefined = flags['repo-file'];
        const skipReposList: string | undefined = flags['skip-repos'];
        const skipReposFile: string | undefined = flags['skip-repo-file'];

        let repos: Repo[] = [];

        if (orgsString) {
            repos = await this.getOrgRepos(sourceInfo, orgsString, apiManager);
            console.debug(`Got repos from org(s): ${repos.map(r => `${r.owner}/${r.name}`)}`);
        }

        const addedRepos = this.getExplicitRepoList(sourceInfo, repos, reposList, reposFile);

        if (addedRepos.length > 0) {
            console.debug(`Added repos from --repo list: ${addedRepos.map(r => `${r.owner}/${r.name}`)}`);
            repos.push(...addedRepos);
        }

        if (repos.length === 0) {
            console.debug('No explicitly specified repos - getting all user repos');
            repos = await this.getUserRepos(apiManager);
        }

        const skipRepos = this.getRepoListFromParams(sourceInfo.minPathLength, sourceInfo.maxPathLength, skipReposList, skipReposFile);

        repos = this.filterRepoList(repos, skipRepos, sourceInfo.repoTerm);

        return repos;
    }
    
    getExplicitRepoList(sourceInfo: SourceInfo, repos: Repo[], reposList?: string, reposFile?: string): Repo[] {
        const explicitRepos = this.getRepoListFromParams(sourceInfo.minPathLength, sourceInfo.maxPathLength, reposList, reposFile);

        const addedRepos: Repo[] = [];

        for (const repo of explicitRepos) {
            if (repos.some(r => this.repoMatches(r, repo))) {
                console.debug(`Skipping adding ${sourceInfo.repoTerm} ${repo.owner}/${repo.name} as we already got it from the ${sourceInfo.orgTerm}`);
            } else {
                addedRepos.push(repo);
            }
        }

        return addedRepos;
    }

    filterRepoList(
        repos: Repo[],
        filterList: { owner: string, name: string }[],
        objectType: string,
        filterfn: (repo: { owner: string, name: string }, filter: { owner: string, name: string }) => boolean = this.repoMatches
    ): Repo[] {
        if (filterList.length > 0) {
            repos = repos.filter(r => {
                if (filterList.some(s => filterfn(r, s))) {
                    console.debug(`Removing explicitly skipped ${objectType} ${r.owner}/${r.name}`);
                    return false;
                } else {
                    return true;
                }
            });
        }

        return repos;
    }

    async getOrgRepos(sourceInfo: SourceInfo, orgsString: string, apiManager: ApiManager): Promise<Repo[]> {
        const repos: Repo[] = [];
        const orgs = stringToArr(orgsString);
        for (const org of orgs) {
            console.debug(`Getting ${sourceInfo.repoTerm}s for ${sourceInfo.orgTerm} ${org}`);
            try {
                const orgRepos = (await apiManager.getOrgRepos(org));
                repos.push(...this.convertRepos(orgRepos));
            } catch (error) {
                if (error instanceof AxiosError) {
                    console.error(`Error getting ${sourceInfo.repoTerm}s for the ${sourceInfo.orgTerm} ${org}: ${error.message}`);
                } else {
                    console.error(`Error getting ${sourceInfo.repoTerm}s for the ${sourceInfo.orgTerm} ${org}:`);
                    console.error(error);
                }
            }
        }

        console.debug(`Found ${repos.length} ${sourceInfo.repoTerm}s for the specified ${sourceInfo.orgTerm}s`);
        return repos;
    }

    repoMatches(repo1: Repo, repo2: Repo): boolean {
        return repo1.owner === repo2.owner && repo1.name === repo2.name;
    }

    getRepoListFromParams(minPathLength: number, maxPathLength: number, reposList?: string, reposFile?: string): Repo[] {
        let repos: Repo[] = [];

        if (reposList) {
            repos = splitRepos(reposList, minPathLength, maxPathLength);
        } else if (reposFile) {
            repos = readRepoFile(reposFile, minPathLength, maxPathLength);
        }

        return repos;
    }

    async getUserRepos(apiManager: ApiManager): Promise<Repo[]> {
        console.debug('No explicitly specified repos - getting all user repos');
        const userRepos = await apiManager.getUserRepos();
        console.debug(`Found ${userRepos.length} repos for the user`);
        const repos = this.convertRepos(userRepos);
        return repos;
    }

    abstract run(): Promise<void>;

    abstract convertRepos(reposResponse: RepoResponse[]): Repo[];
}
