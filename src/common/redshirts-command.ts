import { Command } from "@oclif/core";
import { SourceType, VcsSourceInfo } from "./types";


export default abstract class RedshirtsVcsCommand extends Command {
    abstract getSourceInfo(token: string, baseUrl: string, sourceType: SourceType): VcsSourceInfo;
}