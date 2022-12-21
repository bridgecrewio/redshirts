import {SourceInfo} from './types'

class BaseCounterClass {
   sourceType: string
   excludedUsers: Array<string>
   sourceInfo: SourceInfo

   constructor(sourceType: string, excludedUsers: Array<string>, sourceInfo: SourceInfo) {
      console.info('[BaseVCSClass] was created.', sourceType)
      this.sourceType = sourceType
      this.excludedUsers = excludedUsers
      this.sourceInfo = sourceInfo
   }
}
