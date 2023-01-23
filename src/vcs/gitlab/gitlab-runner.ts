import { Repo, VcsSourceInfo } from '../../common/types';
import { LOGGER } from '../../common/utils';
import { VcsRunner } from '../../common/vcs-runner';
import { GitlabApiManager } from './gitlab-api-manager';
import { GitlabCommit, GitlabRepoResponse } from './gitlab-types';

export class GitlabRunner extends VcsRunner {
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    constructor(sourceInfo: VcsSourceInfo, flags: any, apiManager: GitlabApiManager) {
        super(sourceInfo, [], [], flags, apiManager);
    }

    aggregateCommitContributors(repo: Repo, commits: GitlabCommit[]): void {
        LOGGER.debug(`Processing commits for repo ${repo.owner}/${repo.name}`);
        for (const commit of commits) {
            const newCommit = {
                username: commit.author_name,
                email: commit.author_email,
                commitDate: commit.authored_date,
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
                private: repo.visibility === 'private',
            });
        }

        return filteredRepos;
    }
}
