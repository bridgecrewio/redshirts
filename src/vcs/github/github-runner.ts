import { BaseRunner } from '../../common/base-runner';
import { Repo, SourceInfo } from '../../common/types';
import { GithubApiManager } from './github-api-manager';
import { GithubCommit, GithubRepoResponse } from './github-types';

export class GithubRunner extends BaseRunner {

    constructor(sourceInfo: SourceInfo, flags: any, apiManager: GithubApiManager) {
        super(sourceInfo, ['noreply@github.com'], flags, apiManager);
    }

    aggregateCommitContributors(repo: Repo, commits: GithubCommit[]): void {
        // TODO exclude emails
        console.debug(`Processing commits for repo ${repo.owner}/${repo.name}`);
        for (const commitObject of commits) {
            const { commit, author } = commitObject;
            const username = author.login; // we need to use this object, because the nested commit object has the display name at the time of the commit

            // TODO do we need null checks here?
            const email: string = commit?.author?.email;
            const commitDate: string = commit?.author?.date;

            commitObject.username = username;
            commitObject.commitDate = commitDate;
            commitObject.email = email;

            this.addContributor(repo.owner, repo.name, commitObject);
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
