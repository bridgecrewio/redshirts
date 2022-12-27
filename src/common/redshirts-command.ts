/* eslint-disable no-await-in-loop */
import { Command } from '@oclif/core';
// import { CLIError } from '@oclif/errors';
import { AxiosError } from 'axios';
import { Commit, Repo, RepoResponse, SourceInfo } from '../common/types';
import { ApiManager } from './api-manager';
import { BaseCounter } from './base-counter';
import { printSummary } from './output';
import { readRepoFile, splitRepos, stringToArr } from './utils';

// TODO
// - get commits from all branches for all VCSes and git log
// - unique user identification per VCS

export abstract class RedshirtsCommand extends Command {

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    async execute(flags: any, sourceInfo: SourceInfo, apiManager: ApiManager, counter: BaseCounter): Promise<void> {
        let repos: Repo[] = [];

        // if (!(flags[sourceInfo.orgFlagName] || flags.repos || flags.repoFile)) {
        //     throw new CLIError(`One of the following arguments is required: --repos, --repoFile, --${sourceInfo.orgFlagName}`);
        // }

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
        } else if (flags.repos) {
            repos = splitRepos(flags.repos);
        } else if (flags.repoFile) {
            repos = readRepoFile(flags.repoFile);
        } else {
            console.debug('Getting all user repos');
            const userRepos = await apiManager.getUserRepos();
            console.debug(`Found ${userRepos.length} repos for the user`);
            repos = this.filterRepos(userRepos);
        }

        for (const repo of repos) {
            try {
              const commits: Commit[] = await apiManager.getCommits(repo, flags.days);
              counter.aggregateCommitContributors(repo, commits);
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
