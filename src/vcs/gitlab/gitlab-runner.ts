import { BaseRunner } from '../../common/base-runner';
import { Repo, SourceInfo } from '../../common/types';
import { LOGGER } from '../../common/utils';
import { GitlabApiManager } from './gitlab-api-manager';
import { GitlabCommit, GitlabRepoResponse } from './gitlab-types';

export class GitlabRunner extends BaseRunner {

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    constructor(sourceInfo: SourceInfo, flags: any, apiManager: GitlabApiManager) {
        super(sourceInfo, [], flags, apiManager);
    }

    aggregateCommitContributors(repo: Repo, commits: GitlabCommit[]): void {
        LOGGER.debug(`Processing commits for repo ${repo.owner}/${repo.name}`);
        for (const commit of commits) {
            const email = commit.committer_email;
            const commitDate = commit.committed_date;

            const newCommit = {
                username: email,
                email,
                commitDate
            };

            this.addContributor(repo.owner, repo.name, newCommit);
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
