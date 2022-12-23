import { BaseCounter } from "./base-counter";
import { OutputFormat, Report, SummaryReport } from "./types";
import { jsonReportReplacer } from "./utils";


export const printSummary = (counter: BaseCounter, outputFormat?: string): void => {
    switch (outputFormat) {

       case OutputFormat.JSON:
          console.log(JSON.stringify(generateReportObject(counter), jsonReportReplacer, 2));

          break
       
       case OutputFormat.CSV:
          console.log('Repo,Unique contributors');
          console.log(`Total,${counter.contributorsByUsername.size}`);
          for (const [repo, contributors] of counter.contributorsByRepo) {
             console.log(`${repo},${contributors.size}`);
          } 

          break

       default:
          console.log(`Contributor Details:`);
          console.log(`Total unique contributors (all repos): ${counter.contributorsByUsername.size}`);
          console.log('');
          for (const [repo, contributors] of counter.contributorsByRepo) {
             console.log(`${repo}: ${contributors.size}`);
          }

          break
    }
 }

 const generateReportObject = (counter: BaseCounter): SummaryReport => {

    const repos = new Map<string, Report>();

    for (const [repo, contributors] of counter.contributorsByRepo) {
       repos.set(repo, {
          totalContributors: contributors.size,
          contributors: [...contributors.values()]
       });
    }

    const report: SummaryReport = {
       totalContributors: counter.contributorsByUsername.size,
       contributors: [...counter.contributorsByUsername.values()],
       repos
    };

    return report;
 }
