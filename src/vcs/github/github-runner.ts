import { Repo, VcsSourceInfo } from '../../common/types';
import { LOGGER } from '../../common/utils';
import { VcsRunner } from '../../common/vcs-runner';
import { GithubApiManager } from './github-api-manager';
import { GithubCommit, GithubRepoResponse } from './github-types';

export class GithubRunner extends VcsRunner {
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    constructor(sourceInfo: VcsSourceInfo, flags: any, apiManager: GithubApiManager) {
        super(sourceInfo, [], [], flags, apiManager);
    }

    aggregateCommitContributors(repo: Repo, commits: GithubCommit[]): void {
        LOGGER.debug(`Processing commits for repo ${repo.owner}/${repo.name}`);
        for (const commitObject of commits) {
            const { commit, author } = commitObject;
            const username = author?.login; // we need to use this object, because the nested commit object has the display name at the time of the commit

            const email: string = commit.author.email;
            const commitDate: string = commit.author.date;

            const newCommit = {
                username,
                commitDate,
                email,
            };

            this.addContributor(repo.owner, repo.name, newCommit);
        }
    }

    convertRepos(reposResponse: GithubRepoResponse[]): Repo[] {
        const filteredRepos: Repo[] = [];
        for (const repo of reposResponse) {
            filteredRepos.push({
                name: repo.name,
                owner: repo.owner.login,
                private: repo.private,
            });
        }

        return filteredRepos;
    }
}
