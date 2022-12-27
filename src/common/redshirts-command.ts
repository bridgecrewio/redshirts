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

export abstract class RedshirtsCommand extends Command {

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    async execute(flags: any, sourceInfo: SourceInfo, apiManager: ApiManager, counter: BaseCounter): Promise<void> {
        if (flags.days !== DEFAULT_DAYS) {
            console.warn(`Warning: you specified a --days value of ${flags.days}, which is different from the value used in the Prisma Cloud platform (${DEFAULT_DAYS}). Your results here will differ.`);
        }
        
        let repos: Repo[] = [];

        if (flags[sourceInfo.orgFlagName]) {
            const orgs = stringToArr(flags[sourceInfo.orgFlagName]);
            for (const org of orgs) {
                console.debug(`Getting ${sourceInfo.repoTerm}s for ${sourceInfo.orgTerm} ${org}`);
                try {
                    const orgRepos = (await apiManager.getOrgRepos(org));
                    repos.push(...this.filterRepos(orgRepos));
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
        } 

        let explicitRepos: Repo[] = [];
        
        if (flags.repos) {
            explicitRepos = splitRepos(flags.repos);
        } else if (flags['repo-file']) {
            explicitRepos = readRepoFile(flags['repo-file']);
        }

        for (const repo of explicitRepos) {
            if (repos.some(r => r.name === repo.name && r.owner === repo.owner)) {
                console.debug(`Skipping adding ${sourceInfo.repoTerm} ${repo.owner}/${repo.name} as we already got it from the ${sourceInfo.orgTerm}`);
            } else {
                repos.push(repo);
            }
        }
        
        let skipRepos: Repo[] = [];

        if (flags['skip-repos']) {
            skipRepos = splitRepos(flags['skip-repos']);
        } else if (flags['skip-repo-file']) {
            skipRepos = readRepoFile(flags['skip-repo-file']);
        }
        
        if (repos.length === 0) {
            console.debug('Getting all user repos');
            const userRepos = await apiManager.getUserRepos();
            console.debug(`Found ${userRepos.length} repos for the user`);
            repos = this.filterRepos(userRepos);
        }
        
        if (skipRepos.length > 0) {
            repos = repos.filter(r => {
                if (skipRepos.some(s => r.name === s.name && r.owner === s.owner)) {
                    console.debug(`Removing explicitly skipped ${sourceInfo.repoTerm} ${r.owner}/${r.name}`);
                    return false;
                } else {
                    return true;
                }
            });
        }

        for (const repo of repos) {
            try {
              const commits: Commit[] = await apiManager.getCommits(repo, flags.days);
              if (commits.length > 0) {
                counter.aggregateCommitContributors(repo, commits);
              } else {
                counter.addEmptyRepo(repo);
              }
            } catch (error) {
              if (error instanceof AxiosError) {
                console.error(`Failed to get commits for ${sourceInfo.repoTerm} ${repo.owner}/${repo.name}. Reason: ${error.response?.data?.message}`);
              }
            }
          }
      
          printSummary(counter, flags.output, flags.sort);

    }

    abstract run(): Promise<void>;

    abstract filterRepos(reposResponse: RepoResponse[]): Repo[];
}
