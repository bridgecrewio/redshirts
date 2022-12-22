import { Flags } from '@oclif/core'
import { OutputFormat } from './types'

export const getXDaysAgoDate = (nDaysAgo: number): Date => {
   const xDaysAgo = new Date()
   xDaysAgo.setDate(xDaysAgo.getDate() - nDaysAgo)
   return xDaysAgo
}

export const stringToArr = (csv: string): string[] => {
   return csv.replace(/ /g, '').split(',')
}

export const commonFlags = {
   output: Flags.enum({
      description: "Output format for displaying data. Defaults to 'summary'",
      char: 'o',
      options: Object.values(OutputFormat),
      required: true,
      default: OutputFormat.Summary,
   }),
   repos: Flags.string({
      description: 'Repository names',
      required: false,
   }),
}
