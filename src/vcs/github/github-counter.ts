import { BaseCounter } from '../../common/base-counter';
import { Repo, SourceType } from '../../common/types';
import { GithubCommit } from './github-types';

export class GithubCounter extends BaseCounter {

   constructor() {
      super(SourceType.Github, ['noreply@github.com']);
   }

   aggregateCommitContributors(repo: Repo, commits: GithubCommit[]): void {
      // TODO exclude emails
      console.debug(`Processing commits for repo ${repo.owner}/${repo.name}`);
      for (const commitObject of commits.reverse()) {
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
}
