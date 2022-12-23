import { BaseCounter } from '../../common/base-counter';
import { Repo, SourceType } from '../../common/types';
import { GitlabCommit } from './gitlab-types';

export class GitlabCounter extends BaseCounter {

   constructor() {
      // TODO excluded emails
      super(SourceType.Gitlab, []);
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
}
