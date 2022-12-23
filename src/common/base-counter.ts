// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Commit, Contributor, ContributorMap, OutputFormat, Repo, Report, SummaryReport } from './types';

export abstract class BaseCounter {
   sourceType: string;
   excludedUsers: string[];
   contributorsByUsername: ContributorMap;
   contributorsByRepo: Map<string, ContributorMap>;

   constructor(sourceType: string, excludedUsers: Array<string>) {
      this.sourceType = sourceType;
      this.excludedUsers = excludedUsers;
      this.contributorsByUsername = new Map();
      this.contributorsByRepo = new Map();
   }

   abstract aggregateCommitContributors(repo: Repo, commits: Commit[]): void

   addContributor(repoOwner: string, repoName: string, username: string, email: string, commitDate: string): void {
      // Adds a contributor for the repo and the global list, updating the contributor metadata if necessary (email and last commit)
      // This method assumes that the commits will be added in ascending order of date (oldest first), and thus the commit date
      // parameter is always the "last" commit date (unless updated by another call later)

      const repoPath = repoOwner + '/' + repoName;

      let repoContributors = this.contributorsByRepo.get(repoPath);

      if (!repoContributors) {
         console.debug(`Creating new contributors map for repo ${repoPath}`);
         repoContributors = new Map();
         this.contributorsByRepo.set(repoPath, repoContributors);
      }

      // handle the 2 maps separately so that we can track commit dates per repo and globally
      this.upsertContributor(repoContributors, username, email, commitDate);      
      this.upsertContributor(this.contributorsByUsername, username, email, commitDate);
   }

   upsertContributor(contributorMap: ContributorMap, username: string, email: string, commitDate: string): void {
      const contributor = contributorMap.get(username);

      if (contributor) {
         contributor.emails.add(email);
         contributor.lastCommitDate = commitDate;
      } else {
         console.debug(`Found new contributor: ${username}, ${email}`);
         contributorMap.set(username, {
            username,
            emails: new Set([email]),
            lastCommitDate: commitDate
         });
      }
   }
}
