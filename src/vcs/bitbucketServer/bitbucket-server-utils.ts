import { BitbucketServerCommit } from "./bitbucket-server-types";

export const getBitbucketServerDateCompareFunction = (date: Date): (cs: BitbucketServerCommit) => boolean => {
    // returns a function that returns true if the specified commit's timestamp is older than
    // the date passed to this function
    const dateTime = date.getTime();
    return (c: BitbucketServerCommit) => {
        return c.committerTimestamp < dateTime;
    };
};
