import { Commit, ContributorMap, OutputFormat, Report } from './types'

export abstract class BaseCounterClass {
   sourceType: string
   excludedUsers: Array<string>

   constructor(sourceType: string, excludedUsers: Array<string>) {
      this.sourceType = sourceType
      this.excludedUsers = excludedUsers
   }

   abstract convertCommitsToContributors(commits: Commit[]): ContributorMap

   countContributors(contributorMap: ContributorMap, excludedUsers: string[]): [ContributorMap, number] {
      let totalContributors = 0
      for (const c of contributorMap.keys()) {
         if (excludedUsers.includes(c)) {
            contributorMap.delete(c)
            continue
         }

         totalContributors++
      }

      return [contributorMap, totalContributors]
   }

   printSummary(filteredContributorMap: ContributorMap, totalContributors: number, outputFormat?: string): void {
      switch (outputFormat) {
         case OutputFormat.Summary:
            console.log(`Contributor Details:`)
            for (const [k, v] of filteredContributorMap.entries()) console.log(k, ':', v)
            console.log(`Total Contributors: ${totalContributors}`)

            break

         case OutputFormat.JSON:
            // eslint-disable-next-line no-case-declarations
            const contributorObj = Object.fromEntries(filteredContributorMap)
            // eslint-disable-next-line no-case-declarations
            const report: Report = {
               contributorDetails: contributorObj,
               totalContributors,
            }
            console.log(report)

            break

         default:
            console.log(`Contributor Details:`)
            for (const [k, v] of filteredContributorMap.entries()) console.log(k, ':', v)
            console.log(`Total Contributors: ${totalContributors}`)
            break
      }
   }
}
