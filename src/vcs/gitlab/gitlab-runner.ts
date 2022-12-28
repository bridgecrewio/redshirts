import { BaseRunner } from '../../common/base-runner';
import { Repo, SourceInfo } from '../../common/types';
import { GitlabApiManager } from './gitlab-api-manager';
import { GitlabCommit, GitlabRepoResponse } from './gitlab-types';

export class GitlabRunner extends BaseRunner {

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    constructor(sourceInfo: SourceInfo, flags: any, apiManager: GitlabApiManager) {
        // TODO excluded emails
        super(sourceInfo, [], flags, apiManager);
    }

    aggregateCommitContributors(repo: Repo, commits: GitlabCommit[]): void {
        console.debug(`Processing commits for repo ${repo.owner}/${repo.name}`);
        for (const commit of commits) {
            const email = commit.committer_email;
            const commitDate = commit.committed_date;

            commit.username = email;
            commit.email = email;
            commit.commitDate = commitDate;

            this.addContributor(repo.owner, repo.name, commit);
        }
    }

    convertRepos(reposResponse: GitlabRepoResponse[]): Repo[] {
        const filteredRepos: Repo[] = [];
        for (const repo of reposResponse) {
            filteredRepos.push({
                name: repo.path,
                owner: repo.namespace.full_path,
                private: repo.visibility === 'private'
            });
        }

        return filteredRepos;
    }
}
