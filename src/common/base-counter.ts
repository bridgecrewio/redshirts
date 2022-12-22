// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Commit, Contributor, ContributorMap, OutputFormat, Repo, Report, SummaryReport } from './types'
import { jsonReportReplacer } from './utils';

export abstract class BaseCounterClass {
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
         console.debug(`Found new contributor: ${username}, ${email}`)
         contributorMap.set(username, {
            username,
            emails: new Set([email]),
            lastCommitDate: commitDate
         });
      }
   }

   generateReportObject(): SummaryReport {

      const repos = [];

      for (const [repo, contributors] of this.contributorsByRepo) {
         repos.push({
            repo,
            totalContributors: contributors.size,
            contributors: [...contributors.values()]
         });
      }

      const report: SummaryReport = {
         totalContributors: this.contributorsByUsername.size,
         contributors: [...this.contributorsByUsername.values()],
         repos
      };

      return report;
   }

   printSummary(outputFormat?: string): void {
      switch (outputFormat) {

         case OutputFormat.JSON:
            console.log(JSON.stringify(this.generateReportObject(), jsonReportReplacer, 2));

            break

         default:
            console.log(`Contributor Details:`);
            console.log(`Total unique contributors (all repos): ${this.contributorsByUsername.size}`);
            console.log('');
            for (const [repo, contributors] of this.contributorsByRepo) {
               console.log(`${repo}: ${contributors.size}`);
            }

            break
      }
   }
}
