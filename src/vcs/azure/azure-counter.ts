import { BaseCounter } from '../../common/base-counter';
import { Repo, SourceType } from '../../common/types';
import { AzureCommit } from './azure-types';

export class AzureCounter extends BaseCounter {

    constructor() {
        super(SourceType.AzureRepos, ['noreply@github.com']); // TODO emails
    }

    aggregateCommitContributors(repo: Repo, commits: AzureCommit[]): void {
        // TODO exclude emails
        console.debug(`Processing commits for repo ${repo.owner}/${repo.name}`);
        for (const commitObject of commits) {
            const { author } = commitObject;
            commitObject.username = author.name;
            commitObject.email = author.email;
            commitObject.commitDate = author.date;

            this.addContributor(repo.owner, repo.name, commitObject);
        }
    }
}
