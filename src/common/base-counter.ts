// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Commit, Contributor, ContributorMap, OutputFormat, Report } from './types'

export abstract class BaseCounterClass {
   sourceType: string;
   excludedUsers: string[];
   contributors: Contributor[];
   contributorsByEmail: ContributorMap;
   contributorsByUsername: ContributorMap;
   totalContributors: number

   constructor(sourceType: string, excludedUsers: Array<string>) {
      this.sourceType = sourceType;
      this.excludedUsers = excludedUsers;
      this.contributors = [];
      this.contributorsByEmail = new Map();
      this.contributorsByName = new Map();
      this.totalContributors = 0;
   }

   abstract convertCommitsToContributors(commits: Commit[]): ContributorMap

   addContributor(email: string, name: string, commitDate: string): void {
      // we have to handle the same email with different names and also the same name with different emails
      // when a user makes a commit, the commit stores the email and display name of the user at that time
      // if the display name changes, then future commits will have a different name


   }

   aggregateContributors(contributorMap: ContributorMap): [ContributorMap, number] {
      let totalContributors = 0
      for (const c of contributorMap.keys()) {
         if (this.excludedUsers.includes(c)) {
            contributorMap.delete(c)
            continue
         }

         totalContributors++
      }

      return [contributorMap, totalContributors]
   }

   printSummary(outputFormat?: string): void {
      switch (outputFormat) {
         case OutputFormat.Summary:
            // console.log(`Contributor Details:`)
            // for (const [k, v] of filteredContributorMap.entries()) console.log(k, ':', v)
            // console.log(`Total Contributors: ${totalContributors}`)

            break

         case OutputFormat.JSON:
            // // eslint-disable-next-line no-case-declarations
            // const contributorObj = Object.fromEntries(filteredContributorMap)
            // // eslint-disable-next-line no-case-declarations
            // const report: Report = {
            //    contributorDetails: contributorObj,
            //    totalContributors,
            // }
            // console.log(report)

            break

         default:
            console.log(`Contributor Details:`)
            for (const c of this.contributors) console.log(c)
            console.log(`Total Contributors: ${this.contributors.length}`)
            break
      }
   }
}
